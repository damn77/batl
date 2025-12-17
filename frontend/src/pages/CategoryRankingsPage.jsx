import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Nav, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import RankingsTable from '../components/RankingsTable';
import RankingEntryDetailModal from '../components/RankingEntryDetailModal';
import { listCategories } from '../services/categoryService';
import { getRankingsForCategory } from '../services/rankingService';

const CategoryRankingsPage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [rankings, setRankings] = useState([]);
  const [activeType, setActiveType] = useState('SINGLES');
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState(null);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await listCategories();
      setCategories(data.categories || []);

      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0]);
      }
    } catch (err) {
      setError(t('errors.failedToLoad', { resource: t('nav.categories').toLowerCase() }));
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadRankings = useCallback(async () => {
    if (!selectedCategory) {
      setRankings([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getRankingsForCategory(selectedCategory.id, null, selectedYear);
      setRankings(data || []);
    } catch (err) {
      setError(err.message || t('errors.failedToLoadRankings'));
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedYear, t]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load rankings when dependencies change
  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  // Handle active type switching when rankings change
  useEffect(() => {
    if (rankings.length > 0) {
      const availableTypes = rankings.map(r => r.type);
      if (!availableTypes.includes(activeType)) {
        setActiveType(availableTypes[0]);
      }
    }
  }, [rankings, activeType]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const getActiveRanking = () => {
    return rankings.find(r => r.type === activeType);
  };

  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  const activeRanking = getActiveRanking();

  if (loadingCategories) {
    return (
      <>
        <NavBar />
        <Container className="mt-4 text-center">
          <Spinner animation="border" />
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
              <div className="list-group list-group-flush">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`list-group-item list-group-item-action ${selectedCategory?.id === category.id ? 'active' : ''
                      }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </Card>
          </Col>

          <Col md={9}>
            {selectedCategory && (
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="m-0">{selectedCategory.name}</h3>
                <Form.Select
                  style={{ width: 'auto' }}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Form.Select>
              </div>
            )}

            {!selectedCategory ? (
              <Alert variant="info">{t('alerts.selectCategory')}</Alert>
            ) : loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
              </div>
            ) : rankings.length === 0 ? (
              <Alert variant="info">{t('messages.noRankingsYet')}</Alert>
            ) : (
              <Card>
                <Card.Header>
                  <Nav variant="tabs" activeKey={activeType} onSelect={(k) => setActiveType(k)}>
                    {rankings.map(ranking => (
                      <Nav.Item key={ranking.id}>
                        <Nav.Link eventKey={ranking.type}>
                          {t(`rankingTypes.${ranking.type}`)}
                        </Nav.Link>
                      </Nav.Item>
                    ))}
                  </Nav>
                </Card.Header>
                <Card.Body className="p-0">
                  {activeRanking ? (
                    <RankingsTable
                      data={activeRanking.entries}
                      onRowClick={handleRowClick}
                    />
                  ) : (
                    <div className="p-3 text-center text-muted">
                      {t('messages.noDataForType')}
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>

        {selectedCategory && selectedEntry && (
          <RankingEntryDetailModal
            show={showModal}
            onHide={() => setShowModal(false)}
            categoryId={selectedCategory.id}
            entryId={selectedEntry.id}
          />
        )}
      </Container>
    </>
  );
};

export default CategoryRankingsPage;
