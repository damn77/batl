import apiClient from './apiClient';

export const getAllPointTables = async () => {
    const response = await apiClient.get('/v1/admin/point-tables');
    return response.data;
};

export const getPointTablesForRange = async (range) => {
    const response = await apiClient.get(`/v1/admin/point-tables/${range}`);
    return response.data;
};

export const updatePointTableValue = async (id, points) => {
    const response = await apiClient.put(`/v1/admin/point-tables/${id}`, { points });
    return response.data;
};

export const getTournamentPointPreview = async (tournamentId) => {
    const response = await apiClient.get(`/v1/tournaments/${tournamentId}/point-preview`);
    return response.data;
};
