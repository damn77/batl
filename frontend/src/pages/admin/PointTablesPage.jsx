import { Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import PointTableEditor from '../../components/admin/PointTableEditor';
import NavBar from '../../components/NavBar';

const PointTablesPage = () => {
    const { t } = useTranslation();

    return (
        <>
            <NavBar />
            <Container className="py-4">
                <h2>{t('pages.pointTables.title') || 'Point Table Configuration'}</h2>
                <p className="text-muted">{t('pages.pointTables.description') || 'Configure points awarded for each round based on participant count.'}</p>
                <PointTableEditor />
            </Container>
        </>
    );
};

export default PointTablesPage;
