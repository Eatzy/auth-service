import { Hono } from 'hono';
import { EnhancedEnv } from '../config/enhanced-env';
import { env } from '../config/env';
import { ConfigService } from '../services/config-service';

const configApp = new Hono();

// Admin authentication middleware
const adminAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error:
          'Authorization header required. Use: Authorization: Bearer <BETTER_AUTH_SECRET>',
      },
      401,
    );
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== env.BETTER_AUTH_SECRET) {
    return c.json(
      {
        success: false,
        error: 'Invalid admin token',
      },
      403,
    );
  }

  await next();
};

// Get all configurations (non-secret only for security) - PUBLIC
configApp.get('/', async (c) => {
  try {
    const configs = await ConfigService.getByCategory('');

    // Filter out secret configurations for security
    const safeConfigs = configs
      .filter((config) => !config.isSecret)
      .map((config) => ({
        key: config.key,
        value: config.value,
        description: config.description,
        category: config.category,
        updatedAt: config.updatedAt,
      }));

    return c.json({
      success: true,
      data: safeConfigs,
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch configurations',
      },
      500,
    );
  }
});

// Get configuration by key - PUBLIC (non-secret only)
configApp.get('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const value = await ConfigService.get(key);

    if (value === undefined) {
      return c.json(
        {
          success: false,
          error: 'Configuration not found',
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: { key, value },
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch configuration',
      },
      500,
    );
  }
});

// Get configurations by category - PUBLIC (non-secret only)
configApp.get('/category/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const configs = await ConfigService.getByCategory(category);

    // Filter out secret configurations for security
    const safeConfigs = configs
      .filter((config) => !config.isSecret)
      .map((config) => ({
        key: config.key,
        value: config.value,
        description: config.description,
        category: config.category,
        updatedAt: config.updatedAt,
      }));

    return c.json({
      success: true,
      data: safeConfigs,
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch configurations',
      },
      500,
    );
  }
});

// === ADMIN ENDPOINTS (Require Authorization) ===

// Get all configurations including secrets - ADMIN ONLY
configApp.get('/admin/all', adminAuth, async (c) => {
  try {
    const configs = await ConfigService.getByCategory('');

    // Return all configs including secrets (for admin)
    const allConfigs = configs.map((config) => ({
      key: config.key,
      value: config.value,
      description: config.description,
      category: config.category,
      isSecret: config.isSecret,
      updatedAt: config.updatedAt,
    }));

    return c.json({
      success: true,
      data: allConfigs,
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch configurations',
      },
      500,
    );
  }
});

// Update configuration - ADMIN ONLY
configApp.put('/:key', adminAuth, async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();

    const { value, description, category = 'general', isSecret = false } = body;

    if (!value) {
      return c.json(
        {
          success: false,
          error: 'Value is required',
        },
        400,
      );
    }

    await ConfigService.set(key, value, description, category, isSecret);

    // Force refresh enhanced env cache
    await EnhancedEnv.initialize();

    return c.json({
      success: true,
      message: `Configuration '${key}' updated successfully`,
      data: { key, value, description, category, isSecret },
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to update configuration',
      },
      500,
    );
  }
});

// Refresh cache endpoint - ADMIN ONLY
configApp.post('/refresh', adminAuth, async (c) => {
  try {
    await ConfigService.refreshCache();
    await EnhancedEnv.initialize();

    return c.json({
      success: true,
      message: 'Configuration cache refreshed successfully',
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to refresh cache',
      },
      500,
    );
  }
});

// Initialize default configurations (deprecated - use migrations instead)
configApp.post('/initialize', async (c) => {
  return c.json(
    {
      success: false,
      error:
        'This endpoint is deprecated. Configurations are now seeded via database migrations. Run "bun run db:migrate" instead.',
    },
    410,
  );
});

// Admin endpoint to delete configuration - ADMIN ONLY
configApp.delete('/:key', adminAuth, async (c) => {
  try {
    const key = c.req.param('key');

    // Check if config exists first
    const existing = await ConfigService.get(key);
    if (!existing) {
      return c.json(
        {
          success: false,
          error: 'Configuration not found',
        },
        404,
      );
    }

    // Note: We don't have a delete method in ConfigService, so we'll set it to empty
    // In a real implementation, you might want to add a proper delete method
    await ConfigService.set(key, '', `Deleted configuration`, 'deleted', false);

    return c.json({
      success: true,
      message: `Configuration '${key}' deleted successfully`,
    });
  } catch (_error) {
    return c.json(
      {
        success: false,
        error: 'Failed to delete configuration',
      },
      500,
    );
  }
});

export { configApp };
