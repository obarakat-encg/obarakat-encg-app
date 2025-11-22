/**
 * Firebase RTDB Schema Migration Script
 * 
 * This script migrates data from the old schema to the new schema:
 * - Users: Renames hashed_password to hashed_pwd
 * - Resources: Moves from /files to /resources with hierarchical structure
 * 
 * IMPORTANT: Backup your database before running this script!
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove } from 'firebase/database';

// Firebase configuration - Update with your credentials
const firebaseConfig = {
  apiKey: process.env.VITE_API_KEY,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_DB_URL,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MSG_SENDER_ID,
  appId: process.env.VITE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Migrate users from old schema to new schema
 * Changes: hashed_password → hashed_pwd
 */
async function migrateUsers() {
  console.log('Starting user migration...');
  
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log('No users found to migrate');
      return { success: true, count: 0 };
    }
    
    const users = snapshot.val();
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const userId in users) {
      try {
        const user = users[userId];
        
        // Check if migration is needed
        if (user.hashed_password && !user.hashed_pwd) {
          // Rename field
          user.hashed_pwd = user.hashed_password;
          delete user.hashed_password;
          
          // Update user
          await set(ref(database, `users/${userId}`), user);
          migratedCount++;
          console.log(`✓ Migrated user: ${user.username} (${userId})`);
        } else if (user.hashed_pwd) {
          console.log(`- User already migrated: ${user.username} (${userId})`);
        } else {
          console.warn(`⚠ User missing password field: ${user.username} (${userId})`);
        }
      } catch (error) {
        console.error(`✗ Error migrating user ${userId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nUser migration completed:`);
    console.log(`  - Migrated: ${migratedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    return { success: errorCount === 0, count: migratedCount, errors: errorCount };
  } catch (error) {
    console.error('User migration failed:', error);
    throw error;
  }
}

/**
 * Migrate resources from /files to /resources with new structure
 * Old: /files/[type]/[fileId]
 * New: /resources/[type]/[year]/[module]/[PUSH_KEY]
 */
async function migrateResources(type) {
  console.log(`\nStarting ${type} resources migration...`);
  
  try {
    const oldPath = `files/${type}`;
    const oldRef = ref(database, oldPath);
    const snapshot = await get(oldRef);
    
    if (!snapshot.exists()) {
      console.log(`No ${type} resources found to migrate`);
      return { success: true, count: 0 };
    }
    
    const files = snapshot.val();
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const fileId in files) {
      try {
        const file = files[fileId];
        
        // Determine year and module
        const year = file.year || '3eme';
        const module = file.module || 'general';
        
        // Create new path
        const newPath = `resources/${type}/${year}/${module}`;
        const newRef = ref(database, newPath);
        const pushKey = push(newRef).key;
        
        // Prepare file data
        const fileData = {
          name: file.name || file.originalName || 'Unknown',
          url: file.url || '',
          size: file.size || 0,
          uploadedAt: file.uploadedAt || new Date().toISOString(),
          year: year,
          ext: file.ext || '',
          type: type,
          module: module,
          firebasePath: file.firebasePath || ''
        };
        
        // Write to new location
        await set(ref(database, `${newPath}/${pushKey}`), fileData);
        migratedCount++;
        console.log(`✓ Migrated ${type}: ${fileData.name} → ${newPath}/${pushKey}`);
      } catch (error) {
        console.error(`✗ Error migrating ${type} file ${fileId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n${type} migration completed:`);
    console.log(`  - Migrated: ${migratedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    return { success: errorCount === 0, count: migratedCount, errors: errorCount };
  } catch (error) {
    console.error(`${type} migration failed:`, error);
    throw error;
  }
}

/**
 * Clean up old data after successful migration
 */
async function cleanupOldData() {
  console.log('\n⚠ Cleanup phase - removing old data...');
  
  const confirm = process.argv.includes('--cleanup');
  
  if (!confirm) {
    console.log('Skipping cleanup. Use --cleanup flag to remove old data.');
    return;
  }
  
  try {
    // Remove old /files path
    await remove(ref(database, 'files'));
    console.log('✓ Removed old /files path');
    
    // Remove old /login_credentials path if it exists
    const loginCredsRef = ref(database, 'login_credentials');
    const snapshot = await get(loginCredsRef);
    if (snapshot.exists()) {
      await remove(loginCredsRef);
      console.log('✓ Removed old /login_credentials path');
    }
    
    console.log('\nCleanup completed successfully!');
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('='.repeat(60));
  console.log('Firebase RTDB Schema Migration');
  console.log('='.repeat(60));
  console.log('\n⚠ IMPORTANT: Make sure you have backed up your database!\n');
  
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    const results = {
      users: null,
      cours: null,
      td: null
    };
    
    // Migrate users
    if (!dryRun) {
      results.users = await migrateUsers();
    } else {
      console.log('[DRY RUN] Would migrate users: hashed_password → hashed_pwd');
    }
    
    // Migrate cours resources
    if (!dryRun) {
      results.cours = await migrateResources('cours');
    } else {
      console.log('[DRY RUN] Would migrate cours: /files/cours → /resources/cours/[year]/[module]');
    }
    
    // Migrate td resources
    if (!dryRun) {
      results.td = await migrateResources('td');
    } else {
      console.log('[DRY RUN] Would migrate td: /files/td → /resources/td/[year]/[module]');
    }
    
    // Cleanup old data
    if (!dryRun) {
      await cleanupOldData();
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    
    if (!dryRun) {
      console.log(`Users: ${results.users?.count || 0} migrated, ${results.users?.errors || 0} errors`);
      console.log(`Cours: ${results.cours?.count || 0} migrated, ${results.cours?.errors || 0} errors`);
      console.log(`TD: ${results.td?.count || 0} migrated, ${results.td?.errors || 0} errors`);
      
      const allSuccess = results.users?.success && results.cours?.success && results.td?.success;
      
      if (allSuccess) {
        console.log('\n✓ Migration completed successfully!');
      } else {
        console.log('\n⚠ Migration completed with errors. Please review the logs.');
      }
    } else {
      console.log('\n🔍 Dry run completed. Use without --dry-run to perform actual migration.');
    }
    
    console.log('\nNext steps:');
    console.log('1. Verify the migrated data in Firebase Console');
    console.log('2. Update your application code to use the new schema');
    console.log('3. Update Firebase Security Rules');
    console.log('4. Test all functionality thoroughly');
    console.log('5. Run with --cleanup flag to remove old data (after verification)');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\nMigration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
