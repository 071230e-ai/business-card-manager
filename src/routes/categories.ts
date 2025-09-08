import { Hono } from 'hono'
import type { CloudflareBindings, Category, ApiResponse } from '../types'

const categories = new Hono<{ Bindings: CloudflareBindings }>()

// Get all categories
categories.get('/', async (c) => {
  try {
    const { env } = c
    
    const query = `
      SELECT c.*, COUNT(bc.id) as business_card_count
      FROM categories c
      LEFT JOIN business_cards bc ON c.id = bc.category_id
      GROUP BY c.id, c.name, c.color, c.description, c.created_at, c.updated_at
      ORDER BY c.name
    `
    
    const result = await env.DB.prepare(query).all()
    
    const response: ApiResponse<Category[]> = {
      success: true,
      data: result.results as Category[]
    }
    
    return c.json(response)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500)
  }
})

// Get a single category
categories.get('/:id', async (c) => {
  try {
    const { env } = c
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid ID' }, 400)
    }

    const result = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()

    if (!result) {
      return c.json({ success: false, error: 'Category not found' }, 404)
    }

    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching category:', error)
    return c.json({ success: false, error: 'Failed to fetch category' }, 500)
  }
})

// Create a new category
categories.post('/', async (c) => {
  try {
    const { env } = c
    const data: Category = await c.req.json()

    // Validate required fields
    if (!data.name) {
      return c.json({ success: false, error: 'Name is required' }, 400)
    }

    // Check if category name already exists
    const existingCategory = await env.DB.prepare('SELECT id FROM categories WHERE name = ?').bind(data.name).first()
    
    if (existingCategory) {
      return c.json({ success: false, error: 'Category name already exists' }, 400)
    }

    const query = `
      INSERT INTO categories (name, color, description, created_at, updated_at) 
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `
    
    const result = await env.DB.prepare(query).bind(
      data.name,
      data.color || '#3B82F6',
      data.description || null
    ).run()

    if (!result.success) {
      throw new Error('Failed to insert category')
    }

    return c.json({ 
      success: true, 
      data: { 
        id: result.meta.last_row_id, 
        ...data,
        color: data.color || '#3B82F6'
      } 
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return c.json({ success: false, error: 'Failed to create category' }, 500)
  }
})

// Update a category
categories.put('/:id', async (c) => {
  try {
    const { env } = c
    const id = parseInt(c.req.param('id'))
    const data: Category = await c.req.json()

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid ID' }, 400)
    }

    // Validate required fields
    if (!data.name) {
      return c.json({ success: false, error: 'Name is required' }, 400)
    }

    // Check if category name already exists (excluding current category)
    const existingCategory = await env.DB.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').bind(data.name, id).first()
    
    if (existingCategory) {
      return c.json({ success: false, error: 'Category name already exists' }, 400)
    }

    const query = `
      UPDATE categories SET 
        name = ?, color = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    
    const result = await env.DB.prepare(query).bind(
      data.name,
      data.color || '#3B82F6',
      data.description || null,
      id
    ).run()

    if (result.changes === 0) {
      return c.json({ success: false, error: 'Category not found' }, 404)
    }

    return c.json({ 
      success: true, 
      data: { 
        id, 
        ...data,
        color: data.color || '#3B82F6'
      } 
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return c.json({ success: false, error: 'Failed to update category' }, 500)
  }
})

// Delete a category
categories.delete('/:id', async (c) => {
  try {
    const { env } = c
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid ID' }, 400)
    }

    // Check if category has associated business cards
    const businessCards = await env.DB.prepare('SELECT COUNT(*) as count FROM business_cards WHERE category_id = ?').bind(id).first()
    
    if (businessCards && businessCards.count > 0) {
      return c.json({ 
        success: false, 
        error: `Cannot delete category. ${businessCards.count} business cards are using this category.` 
      }, 400)
    }

    const result = await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()

    if (result.changes === 0) {
      return c.json({ success: false, error: 'Category not found' }, 404)
    }

    return c.json({ success: true, message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return c.json({ success: false, error: 'Failed to delete category' }, 500)
  }
})

export default categories