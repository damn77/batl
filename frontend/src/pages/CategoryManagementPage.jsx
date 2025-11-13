import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Badge,
  Alert,
  Spinner,
  Form,
  Modal,
  Table
} from 'react-bootstrap';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender
} from '@tanstack/react-table';
import NavBar from '../components/NavBar';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  CATEGORY_TYPES,
  AGE_GROUPS,
  GENDERS,
  formatCategoryName
} from '../services/categoryService';

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    ageGroup: '',
    gender: '',
    description: ''
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (typeFilter) filters.type = typeFilter;
      if (ageGroupFilter) filters.ageGroup = ageGroupFilter;
      if (genderFilter) filters.gender = genderFilter;

      const data = await listCategories(filters);
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [typeFilter, ageGroupFilter, genderFilter]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Category',
        cell: ({ row }) => (
          <strong>{row.original.name}</strong>
        )
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (
          <Badge bg={getValue() === 'SINGLES' ? 'primary' : 'info'}>
            {getValue()}
          </Badge>
        )
      },
      {
        accessorKey: 'ageGroup',
        header: 'Age Group',
        cell: ({ getValue }) => {
          const value = getValue();
          return value === 'ALL_AGES' ? 'All Ages' : `${value.replace('AGE_', '')}+`;
        }
      },
      {
        accessorKey: 'gender',
        header: 'Gender',
        cell: ({ getValue }) => {
          const genderMap = { MEN: "Men's", WOMEN: "Women's", MIXED: 'Mixed' };
          return genderMap[getValue()] || getValue();
        }
      },
      {
        id: 'stats',
        header: 'Stats',
        cell: ({ row }) => {
          const counts = row.original._counts || {};
          return (
            <div className="small">
              <div>Tournaments: {counts.tournaments || 0}</div>
              <div>Registrations: {counts.registrations || 0}</div>
            </div>
          );
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => handleEditCategory(row.original)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => handleDeleteClick(row.original)}
              disabled={(row.original._counts?.tournaments || 0) > 0}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  // Handlers
  const handleCreateClick = () => {
    setFormData({ type: '', ageGroup: '', gender: '', description: '' });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setFormData({
      type: category.type,
      ageGroup: category.ageGroup,
      gender: category.gender,
      description: category.description || ''
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleDeleteClick = (category) => {
    setSelectedCategory(category);
    setShowDeleteConfirm(true);
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    if (!formData.type || !formData.ageGroup || !formData.gender) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await createCategory(formData);
      setShowCreateModal(false);
      loadCategories();
    } catch (err) {
      setFormError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setFormError(null);

      await updateCategory(selectedCategory.id, { description: formData.description });
      setShowEditModal(false);
      loadCategories();
    } catch (err) {
      setFormError(err.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);
      await deleteCategory(selectedCategory.id);
      setShowDeleteConfirm(false);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>Category Management</h2>
            <p className="text-muted">Create and manage tournament categories</p>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={handleCreateClick}>
              Create Category
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <Card className="mb-3">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="SINGLES">Singles</option>
                    <option value="DOUBLES">Doubles</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Age Group</Form.Label>
                  <Form.Select value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)}>
                    <option value="">All Age Groups</option>
                    {Object.keys(AGE_GROUPS).map(ag => (
                      <option key={ag} value={ag}>
                        {ag === 'ALL_AGES' ? 'All Ages' : `${ag.replace('AGE_', '')}+`}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
                    <option value="">All Genders</option>
                    <option value="MEN">Men&apos;s</option>
                    <option value="WOMEN">Women&apos;s</option>
                    <option value="MIXED">Mixed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Categories Table */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : categories.length === 0 ? (
          <Alert variant="info">No categories found. Create your first category to get started.</Alert>
        ) : (
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id}>
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
              <div className="text-muted small">
                Total: {categories.length} categories
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Create Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Create Category</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitCreate}>
            <Modal.Body>
              {formError && <Alert variant="danger">{formError}</Alert>}

              <Form.Group className="mb-3">
                <Form.Label>Type *</Form.Label>
                <Form.Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="">Select type...</option>
                  <option value="SINGLES">Singles</option>
                  <option value="DOUBLES">Doubles</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Age Group *</Form.Label>
                <Form.Select
                  value={formData.ageGroup}
                  onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                  required
                >
                  <option value="">Select age group...</option>
                  {Object.keys(AGE_GROUPS).map(ag => (
                    <option key={ag} value={ag}>
                      {ag === 'ALL_AGES' ? 'All Ages' : `${ag.replace('AGE_', '')}+`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Gender *</Form.Label>
                <Form.Select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  required
                >
                  <option value="">Select gender...</option>
                  <option value="MEN">Men&apos;s</option>
                  <option value="WOMEN">Women&apos;s</option>
                  <option value="MIXED">Mixed</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </Form.Group>

              {formData.type && formData.ageGroup && formData.gender && (
                <Alert variant="info">
                  Category name: <strong>{formatCategoryName(formData.type, formData.ageGroup, formData.gender)}</strong>
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Category'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Category</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitEdit}>
            <Modal.Body>
              {formError && <Alert variant="danger">{formError}</Alert>}

              <Alert variant="info">
                <strong>{selectedCategory?.name}</strong>
                <div className="small text-muted">Type, age group, and gender cannot be changed after creation</div>
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation */}
        <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete <strong>{selectedCategory?.name}</strong>?
            <Alert variant="warning" className="mt-3 mb-0">
              This action cannot be undone.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default CategoryManagementPage;
