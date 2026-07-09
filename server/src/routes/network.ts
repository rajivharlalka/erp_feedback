import { Router } from 'express';
import { MODES } from '../config.js';
import { fetchNetwork } from '../tflNetworkService.js';

export const networkRouter = Router();

networkRouter.get('/network', async (req, res) => {
  const requested = typeof req.query.modes === 'string' ? req.query.modes.split(',').filter(Boolean) : [...MODES];

  // Only ever fetch modes this deployment is configured to support.
  const modes = requested.filter((m): m is string => (MODES as readonly string[]).includes(m));
  const effectiveModes = modes.length > 0 ? modes : [...MODES];

  try {
    const network = await fetchNetwork(effectiveModes);
    res.json(network);
  } catch (err) {
    console.error('Failed to build network response:', err);
    res.status(502).json({
      error: 'Failed to fetch live data from the TfL Unified API. Please try again shortly.',
    });
  }
});
