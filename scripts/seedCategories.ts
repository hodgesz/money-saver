#!/usr/bin/env ts-node

/**
 * Seed Script: Standard Categories
 *
 * Populates the database with standard budget categories
 * Run this script once per user to set up their initial categories
 *
 * Usage: npx ts-node scripts/seedCategories.ts
 */

import { createClient } from '@supabase/supabase-js'
import { STANDARD_CATEGORIES } from '../lib/config/standardCategories'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env.local file')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedCategories() {
  console.log('🌱 Seeding standard categories...\n')

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      process.exit(1)
    }

    if (!users || users.users.length === 0) {
      console.log('⚠️  No users found. Please create a user account first.')
      process.exit(0)
    }

    console.log(`📊 Found ${users.users.length} user(s)\n`)

    // For each user, seed their categories
    for (const user of users.users) {
      console.log(`Processing user: ${user.email}`)

      // Check if user already has categories
      const { data: existingCategories, error: checkError } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', user.id)

      if (checkError) {
        console.error(`  ❌ Error checking categories:`, checkError.message)
        continue
      }

      if (existingCategories && existingCategories.length > 0) {
        console.log(`  ⏭️  User already has ${existingCategories.length} categories, skipping...`)
        continue
      }

      // Insert standard categories for this user
      const categoriesToInsert = STANDARD_CATEGORIES.map(cat => ({
        name: cat.name,
        color: cat.color,
        user_id: user.id,
      }))

      const { data, error } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select()

      if (error) {
        console.error(`  ❌ Error inserting categories:`, error.message)
        continue
      }

      console.log(`  ✅ Created ${data?.length || 0} categories`)
      data?.forEach(cat => {
        console.log(`     • ${cat.name}`)
      })
      console.log()
    }

    console.log('✨ Seeding complete!\n')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the seed script
seedCategories()
