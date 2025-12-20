async function seedConfigurations() {
  console.log('🌱 Starting configuration seeding...');

  console.log(
    '✅ Configuration seeding is now handled via database migrations',
  );
  console.log('   Run: bun run db:migrate');
  console.log(
    '   This will populate the configuration table with default values',
  );
  console.log('   Use the admin API to update configurations after migration');
  console.log(
    '   Admin API requires Authorization: Bearer <BETTER_AUTH_SECRET>',
  );
}

// Run seeding if called directly
if (require.main === module) {
  seedConfigurations()
    .then(() => {
      console.log('✅ Configuration seeding check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Configuration seeding check failed:', error);
      process.exit(1);
    });
}

export { seedConfigurations };
