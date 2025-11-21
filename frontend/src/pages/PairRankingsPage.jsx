import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Alert,
  Form,
  Pagination,
} from 'react-bootstrap';
import NavBar from '../components/NavBar';
import { listCategories } from '../services/categoryService';
import { getPairRankings, formatWinRate, getRankBadgeVariant } from '../services/rankingService';

/**
 * PairRankingsPage
 * Feature: 006-doubles-pairs - User Story 2 (T048-T050)
 *
 * Displays pair rankings for doubles categories:
 * - Category selector (only DOUBLES type)
 * - Rankings table with rank, player names, points, wins, losses, win rate
 * - Pagination controls
 * - Public access (no authentication required)
 */
const PairRankingsPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [rankingsData, setRankingsData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);

  const limit = 50; // Items per page

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadRankings();
    } else {
      setRankingsData(null);
    }
  }, [selectedCategoryId, currentPage]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setError(null);

      const categoriesData = await listCategories({});
      const doublesCategories =
        categoriesData.categories?.filter((cat) => cat.type === 'DOUBLES') || [];
      setCategories(doublesCategories);

      // Auto-select first category if available
      if (doublesCategories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(doublesCategories[0].id);
      }
    } catch (err) {
      setError(`Failed to load categories: ${err.message}`);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getPairRankings(selectedCategoryId, {
        page: currentPage,
        limit,
      });
      setRankingsData(data);
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(
        errorData?.message || `Failed to load pair rankings: ${err.message}`
      );
      setRankingsData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setCurrentPage(1); // Reset to first page when category changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    if (!rankingsData?.pagination) return null;

    const { page, pages } = rankingsData.pagination;
    const items = [];

    // Always show first page
    if (page > 1) {
      items.push(
        <Pagination.First key="first" onClick={() => handlePageChange(1)} />
      );
      items.push(
        <Pagination.Prev
          key="prev"
          onClick={() => handlePageChange(page - 1)}
        />
      );
    }

    // Show pages around current page
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Always show last page
    if (page < pages) {
      items.push(
        <Pagination.Next
          key="next"
          onClick={() => handlePageChange(page + 1)}
        />
      );
      items.push(
        <Pagination.Last key="last" onClick={() => handlePageChange(pages)} />
      );
    }

    return items;
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row>
          <Col>
            <h1>Pair Rankings</h1>
            <p className="text-muted">
              View doubles pair rankings for each category. Rankings are updated
              automatically after tournaments complete.
            </p>
          </Col>
        </Row>

        {/* Category Selector (T049) */}
        <Row className="mt-3">
          <Col md={6}>
            <Card>
              <Card.Body>
                <Form.Group>
                  <Form.Label>Select Doubles Category</Form.Label>
                  <Form.Select
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={loadingCategories || categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">No doubles categories available</option>
                    ) : (
                      <>
                        <option value="">Select a category...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.gender}, {cat.ageGroup})
                          </option>
                        ))}
                      </>
                    )}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Only DOUBLES type categories are shown
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {error && (
          <Row className="mt-3">
            <Col>
              <Alert variant="danger" onClose={() => setError(null)} dismissible>
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {loading && (
          <Row className="mt-3">
            <Col className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading rankings...</span>
              </Spinner>
            </Col>
          </Row>
        )}

        {/* Rankings Table (T048) */}
        {!loading && rankingsData && (
          <>
            <Row className="mt-3">
              <Col>
                <Card>
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">
                        {rankingsData.category.name} - Pair Rankings
                      </h5>
                      <small className="text-muted">
                        {rankingsData.pagination.total} pairs
                      </small>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {rankingsData.rankings.length === 0 ? (
                      <div className="text-center p-4">
                        <p className="text-muted mb-0">
                          No pair rankings available for this category yet.
                        </p>
                      </div>
                    ) : (
                      <Table striped bordered hover responsive className="mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Rank</th>
                            <th>Player 1</th>
                            <th>Player 2</th>
                            <th style={{ width: '100px' }}>Seeding</th>
                            <th style={{ width: '100px' }}>Points</th>
                            <th style={{ width: '80px' }}>Wins</th>
                            <th style={{ width: '80px' }}>Losses</th>
                            <th style={{ width: '100px' }}>Win Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankingsData.rankings.map((ranking) => (
                            <tr key={ranking.pair.id}>
                              <td>
                                <Badge bg={getRankBadgeVariant(ranking.rank)}>
                                  #{ranking.rank}
                                </Badge>
                              </td>
                              <td>{ranking.pair.player1.name}</td>
                              <td>{ranking.pair.player2.name}</td>
                              <td className="text-center">
                                {ranking.pair.seedingScore.toFixed(0)}
                              </td>
                              <td className="text-end">
                                <strong>{ranking.points.toFixed(0)}</strong>
                              </td>
                              <td className="text-center text-success">
                                {ranking.wins}
                              </td>
                              <td className="text-center text-danger">
                                {ranking.losses}
                              </td>
                              <td className="text-center">
                                {formatWinRate(ranking.winRate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Pagination Controls (T050) */}
            {rankingsData.pagination.pages > 1 && (
              <Row className="mt-3">
                <Col className="d-flex justify-content-center">
                  <Pagination>{renderPaginationItems()}</Pagination>
                </Col>
              </Row>
            )}

            {/* Pagination Info */}
            {rankingsData.rankings.length > 0 && (
              <Row className="mt-2">
                <Col className="text-center">
                  <small className="text-muted">
                    Showing {(currentPage - 1) * limit + 1} to{' '}
                    {Math.min(
                      currentPage * limit,
                      rankingsData.pagination.total
                    )}{' '}
                    of {rankingsData.pagination.total} pairs
                  </small>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* Help Text */}
        <Row className="mt-4">
          <Col>
            <Card bg="light">
              <Card.Body>
                <h6>About Pair Rankings</h6>
                <ul className="mb-0 small">
                  <li>
                    <strong>Points:</strong> Total points earned by this specific
                    pair in tournaments
                  </li>
                  <li>
                    <strong>Seeding Score:</strong> Combined individual ranking
                    points of both players (used for tournament seeding)
                  </li>
                  <li>
                    <strong>Win Rate:</strong> Percentage of matches won by this
                    pair
                  </li>
                  <li>
                    Rankings are updated automatically after each tournament
                    completes
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default PairRankingsPage;
