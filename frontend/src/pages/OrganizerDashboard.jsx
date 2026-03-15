import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import NavBar from '../components/NavBar';

const OrganizerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickLinks = [
    {
      title: t('nav.players') || 'Players',
      description: 'Manage player profiles',
      path: '/organizer/players'
    },
    {
      title: t('nav.tournaments') || 'Tournaments',
      description: 'Create and manage tournaments',
      path: '/organizer/tournaments'
    },
    {
      title: t('nav.categories') || 'Categories',
      description: 'Manage categories',
      path: '/organizer/categories'
    },
    {
      title: t('nav.rankings') || 'Rankings',
      description: 'View category rankings',
      path: '/rankings'
    }
  ];

  return (
    <>
      <NavBar />
      <Container className="mt-3">
        <h2 className="mb-1">{t('pages.organizer.title')}</h2>
        <p className="text-muted small mb-4">{user?.email}</p>

        <Row className="g-2 mb-4">
          {quickLinks.map((link) => (
            <Col key={link.path} xs={12} sm={6} md={4}>
              <Card className="h-100">
                <Card.Body className="d-flex flex-column">
                  <Card.Title as="h6">{link.title}</Card.Title>
                  <Card.Text className="text-muted small flex-grow-1">{link.description}</Card.Text>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => navigate(link.path)}
                  >
                    {link.title}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
};

export default OrganizerDashboard;
