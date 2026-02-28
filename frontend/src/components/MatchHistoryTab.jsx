// Phase 3 - STATS-01: Match history table with filter and pagination
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Table, Spinner, Alert, Badge, Form, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getPlayerMatchHistory } from '../services/playerService';

const MatchHistoryTab = ({ playerId }) => {
  const [matches, setMatches] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState(null);
  const [sortBy, setSortBy] = useState('completedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  // Accumulated unique categories from all fetches for the dropdown
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPlayerMatchHistory(playerId, { page, limit: 20, categoryId, sortBy, sortOrder });
        if (cancelled) return;

        setMatches(result.matches || []);
        setPagination(result.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });

        // Accumulate unique categories from each fetch result
        if (result.matches && result.matches.length > 0) {
          setCategories((prev) => {
            const seenIds = new Set(prev.map((c) => c.id));
            const newCats = result.matches
              .map((m) => m.category)
              .filter((c) => {
                if (!c || !c.id || seenIds.has(c.id)) return false;
                seenIds.add(c.id); // deduplicate within current batch too
                return true;
              });
            if (newCats.length === 0) return prev;
            return [...prev, ...newCats];
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load match history.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMatches();

    return () => {
      cancelled = true;
    };
  }, [playerId, page, categoryId, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const sortIndicator = (column) => {
    if (sortBy !== column) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setCategoryId(value === '' ? null : value);
    setPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const renderPagination = () => {
    const { totalPages } = pagination;
    if (totalPages <= 1) return null;

    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      />
    );

    for (let p = startPage; p <= endPage; p++) {
      items.push(
        <Pagination.Item
          key={p}
          active={p === page}
          onClick={() => handlePageChange(p)}
        >
          {p}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(page + 1)}
        disabled={page === pagination.totalPages}
      />
    );

    return <Pagination className="mt-3 justify-content-center">{items}</Pagination>;
  };

  const renderResult = (outcome) => {
    if (!outcome) return null;
    return (
      <Badge bg={outcome === 'W' ? 'success' : 'danger'} pill>
        {outcome}
      </Badge>
    );
  };

  return (
    <div>
      {/* Category filter */}
      <div className="d-flex justify-content-end align-items-center mb-3">
        <Form.Label className="me-2 mb-0">Filter by category:</Form.Label>
        <Form.Select
          style={{ width: 'auto', minWidth: '180px' }}
          value={categoryId || ''}
          onChange={handleCategoryChange}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Form.Select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Alert variant="danger">{error}</Alert>
      )}

      {/* Empty state */}
      {!loading && !error && pagination.total === 0 && (
        <p className="text-muted text-center py-4">No matches played yet.</p>
      )}

      {/* Match table */}
      {!loading && !error && pagination.total > 0 && (
        <>
          <Table hover responsive>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('tournamentName')}>
                  Tournament{sortIndicator('tournamentName')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('completedAt')}>
                  Date{sortIndicator('completedAt')}
                </th>
                <th>Category</th>
                <th>Opponent</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.matchId}>
                  <td>
                    <Link to={`/tournaments/${match.tournamentId}`}>{match.tournamentName}</Link>
                  </td>
                  <td>{match.completedAt ? new Date(match.completedAt).toLocaleDateString() : '-'}</td>
                  <td>{match.category?.name || '-'}</td>
                  <td>{match.opponentName || '-'}</td>
                  <td>{match.score}</td>
                  <td>{renderResult(match.outcome)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {renderPagination()}
        </>
      )}
    </div>
  );
};

MatchHistoryTab.propTypes = {
  playerId: PropTypes.string.isRequired
};

export default MatchHistoryTab;
