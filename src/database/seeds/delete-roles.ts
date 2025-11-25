import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function deleteRoles() {
  try {
    console.log('🗑️  Eliminando roles existentes...');

    // Delete user_roles first (foreign key constraint)
    await pool.query('DELETE FROM "_RoleToUser"');
    console.log('✅ Relaciones usuario-rol eliminadas');

    // Delete roles
    await pool.query('DELETE FROM roles');
    console.log('✅ Roles eliminados');

    await pool.end();
    console.log('✅ Listo para ejecutar la migración');
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

deleteRoles();
