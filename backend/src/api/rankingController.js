// Ranking Controller - HTTP handlers for ranking endpoints
import * as rankingService from '../services/rankingService.js';
import * as yearRolloverService from '../services/yearRolloverService.js';

/**
 * GET /api/v1/rankings
 * Get all rankings (summary)
 */
export async function getAllRankings(req, res, next) {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const rankings = await rankingService.getAllRankings(year);
    return res.status(200).json({ success: true, data: rankings });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/rankings/:categoryId
 * GET /api/v1/rankings/:categoryId/type/:type
 * Get rankings for a category, optionally filtered by type
 * Query params: page, limit, search, year
 */
export async function getRankingsForCategory(req, res, next) {
  try {
    const { categoryId, type } = req.params;
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const page = req.query.page ? parseInt(req.query.page) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const search = req.query.search || undefined;

    const options = {};
    if (page) options.page = page;
    if (limit) options.limit = limit;
    if (search) options.search = search;

    const rankings = await rankingService.getRankingsForCategory(categoryId, year, options);

    let data = rankings;
    if (type) {
      data = rankings.filter(r => r.type === type);
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/rankings/:categoryId/entries/:entryId/breakdown
 * Get ranking entry details with tournament breakdown
 */
export async function getRankingEntryBreakdown(req, res, next) {
  try {
    const { entryId } = req.params;
    const breakdown = await rankingService.getRankingEntryBreakdown(entryId);
    return res.status(200).json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
}

export async function executeYearRollover(req, res, next) {
  try {
    const { categoryId, year } = req.body;
    const result = await yearRolloverService.executeYearRollover(categoryId, year);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getArchivedRankings(req, res, next) {
  try {
    const { categoryId, year } = req.params;
    const result = await yearRolloverService.getArchivedRankings(categoryId, parseInt(year));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteArchivedRanking(req, res, next) {
  try {
    const { categoryId, year } = req.params;
    await rankingService.deleteArchivedRanking(categoryId, parseInt(year));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function recalculateRankings(req, res, next) {
  try {
    const { categoryId } = req.params;
    await rankingService.recalculateRankings(categoryId);
    res.json({ success: true, message: 'Recalculation complete' });
  } catch (err) {
    next(err);
  }
}
