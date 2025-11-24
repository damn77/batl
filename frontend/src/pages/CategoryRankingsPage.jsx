import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Spinner, Table } from 'react-bootstrap';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import { listCategories } from '../services/categoryService';
import { getCategoryLeaderboard, formatWinRate, formatRank, getRankBadgeVariant } from '../services/rankingService';

const CategoryRankingsPage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rankings, setRankings] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadRankings();
    } else {
      setRankings([]);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await listCategories();
      setCategories(data.categories || []);

      // Auto-select first category if available
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getCategoryLeaderboard(selectedCategory, { limit: 50 });
      setRankings(data.rankings || []);
      setCategoryName(data.categoryName);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      if (err.code === 'CATEGORY_NOT_FOUND') {
        setError('Category not found');
      } else {
        setError(err.message || 'Failed to load rankings');
      }
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        accessorKey: 'rank',
        header: t('table.headers.rank'),
        size: 80,
        cell: ({ getValue }) => (
          <Badge bg={getRankBadgeVariant(getValue())} className="fs-6">
            {formatRank(getValue())}
          </Badge>
        )
      },
      {
        accessorKey: 'playerName',
        header: t('table.headers.playerName'),
        cell: ({ getValue }) => <strong>{getValue()}</strong>
      },
      {
        accessorKey: 'points',
        header: t('table.headers.points'),
        size: 100,
        cell: ({ getValue }) => <strong>{getValue()}</strong>
      },
      {
        accessorKey: 'wins',
        header: t('table.headers.wins'),
        size: 80
      },
      {
        accessorKey: 'losses',
        header: t('table.headers.losses'),
        size: 80
      },
      {
        accessorKey: 'winRate',
        header: t('table.headers.winRate'),
        size: 100,
        cell: ({ getValue }) => formatWinRate(getValue())
      }
    ],
    [t]
  );

  const table = useReactTable({
    data: rankings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  if (loadingCategories) {
    return (
      <>
        <NavBar />
        <Container className="mt-4">
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>{t('pages.rankings.title')}</h2>
            <p className="text-muted">{t('pages.rankings.subtitle')}</p>
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        <Row>
          <Col md={3}>
            <Card>
              <Card.Header>
                <strong>{t('nav.categories')}</strong>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className={`list-group-item list-group-item-action ${
                        selectedCategory === category.id ? 'active' : ''
                      }`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                      <Badge
                        bg="secondary"
                        className="float-end"
                      >
                        {category._counts?.rankings || 0}
                      </Badge>
                    </button>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={9}>
            {!selectedCategory ? (
              <Alert variant="info">{t('alerts.selectCategory')}</Alert>
            ) : loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : rankings.length === 0 ? (
              <Alert variant="info">
                No rankings available for this category yet. Rankings are updated after tournament completion.
              </Alert>
            ) : (
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <strong>{categoryName} - Leaderboard</strong>
                  {lastUpdated && (
                    <small className="text-muted">
                      Last updated: {new Date(lastUpdated).toLocaleDateString()}
                    </small>
                  )}
                </Card.Header>
                <Card.Body className="p-0">
                  <Table hover className="mb-0">
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              style={{ width: header.column.getSize() }}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
                <Card.Footer className="text-muted small">
                  Showing {rankings.length} ranked players
                </Card.Footer>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default CategoryRankingsPage;
