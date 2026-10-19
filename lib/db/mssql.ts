import sql from 'mssql';
import bcrypt from 'bcryptjs';

const commonPoolConfig = {
  requestTimeout: 120000,
  connectionTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 120000,
  },
};

// Configuration for 2k8 Database
const config2k8: sql.config = {
  ...commonPoolConfig,
  user: process.env.DB_2K8_USER,
  password: process.env.DB_2K8_PASSWORD,
  server: process.env.DB_2K8_SERVER || '',
  database: process.env.DB_2K8_DATABASE,
};

// Configuration for 2k12 Database
const config2k12: sql.config = {
  ...commonPoolConfig,
  user: process.env.DB_2K12_USER,
  password: process.env.DB_2K12_PASSWORD,
  server: process.env.DB_2K12_SERVER || '',
  database: process.env.DB_2K12_DATABASE,
};

// Configuration for APP Database (Módulo de Usuarios)
const configApp: sql.config = {
  ...commonPoolConfig,
  user: process.env.DB_APP_USER,
  password: process.env.DB_APP_PASSWORD,
  server: process.env.DB_APP_SERVER || 'localhost',
  database: process.env.DB_APP_DATABASE,
};

// Pool instances
let pool2k8: sql.ConnectionPool | null = null;
let pool2k12: sql.ConnectionPool | null = null;
let poolApp: sql.ConnectionPool | null = null;

/**
 * Gets the connection pool for Profit 2k8
 */
export async function getPool2k8(): Promise<sql.ConnectionPool> {
  if (!pool2k8) {
    try {
      pool2k8 = await new sql.ConnectionPool(config2k8).connect();
      console.log('Connected to Profit 2k8 DB successfully');
    } catch (err) {
      console.error('Database Connection Failed for 2k8', err);
      throw err;
    }
  }
  return pool2k8;
}

/**
 * Gets the connection pool for Profit 2k12
 */
export async function getPool2k12(): Promise<sql.ConnectionPool> {
  if (!pool2k12) {
    try {
      pool2k12 = await new sql.ConnectionPool(config2k12).connect();
      console.log('Connected to Profit 2k12 DB successfully');
    } catch (err) {
      console.error('Database Connection Failed for 2k12', err);
      throw err;
    }
  }
  return pool2k12;
}

/**
 * Gets the connection pool for APP Database (Usuarios)
 */
export async function getAppPool(): Promise<sql.ConnectionPool> {
  if (!poolApp) {
    try {
      try {
        poolApp = await new sql.ConnectionPool(configApp).connect();
      } catch (connErr: any) {
        const isDbNotFound = connErr?.number === 4060 || connErr?.message?.includes('Cannot open database');
        if (isDbNotFound && configApp.database) {
          console.log(`Base de datos '${configApp.database}' no encontrada. Creándola en 'master'...`);
          const masterConfig: sql.config = { ...configApp, database: 'master' };
          const masterPool = await new sql.ConnectionPool(masterConfig).connect();
          const safeDbName = configApp.database.replace(/]/g, ']]');
          await masterPool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'${safeDbName.replace(/'/g, "''")}')
            BEGIN
              CREATE DATABASE [${safeDbName}];
            END
          `);
          await masterPool.close();
          poolApp = await new sql.ConnectionPool(configApp).connect();
        } else {
          throw connErr;
        }
      }

      console.log('Connected to APP DB successfully');

      // Auto-creación de tabla de Usuarios
      const createTableQuery = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Usuarios' and xtype='U')
        BEGIN
          CREATE TABLE Usuarios (
            id_usuario INT IDENTITY(1,1) PRIMARY KEY,
            nombre_completo VARCHAR(255) NOT NULL,
            nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
            correo VARCHAR(255) NULL,
            contrasena_hash VARCHAR(255) NOT NULL,
            rol_usuario VARCHAR(50) NOT NULL,
            esta_activo BIT DEFAULT 1
          );
        END
        ELSE
        BEGIN
          IF NOT EXISTS (
            SELECT * FROM sys.columns 
            WHERE Name = N'correo' AND Object_ID = Object_ID(N'Usuarios')
          )
          BEGIN
            ALTER TABLE Usuarios ADD correo VARCHAR(255) NULL;
          END
        END
      `;
      await poolApp.request().query(createTableQuery);

      // Auto-creación de tabla para solicitudes de cambio de coordenadas de clientes
      const createSolicitudesQuery = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SolicitudesCoordenadas' and xtype='U')
        BEGIN
          CREATE TABLE SolicitudesCoordenadas (
            id_solicitud INT IDENTITY(1,1) PRIMARY KEY,
            codigo_cliente VARCHAR(50) NOT NULL,
            rif_cliente VARCHAR(50) NOT NULL,
            descripcion_cliente VARCHAR(255) NOT NULL,
            direccion_cliente VARCHAR(500),
            coordenada_original VARCHAR(100),
            coordenada_propuesta VARCHAR(100) NOT NULL,
            status_solicitud VARCHAR(20) DEFAULT 'PENDIENTE',
            fecha_creacion DATETIME DEFAULT GETDATE()
          );
        END
      `;
      await poolApp.request().query(createSolicitudesQuery);

      // Verificar si hay usuarios, si no hay, insertar el admin
      const checkUsersQuery = `SELECT COUNT(*) as total FROM Usuarios`;
      const usersResult = await poolApp.request().query(checkUsersQuery);
      
      if (usersResult.recordset[0].total === 0) {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
        const hashedPw = bcrypt.hashSync(adminPassword, 10);
        
        await poolApp.request()
          .input('nombre_completo', 'Administrador')
          .input('nombre_usuario', adminUsername)
          .input('contrasena_hash', hashedPw)
          .input('rol_usuario', 'admin')
          .query(`
            INSERT INTO Usuarios (nombre_completo, nombre_usuario, contrasena_hash, rol_usuario, esta_activo)
            VALUES (@nombre_completo, @nombre_usuario, @contrasena_hash, @rol_usuario, 1);
          `);
        console.log(`Usuario por defecto creado exitosamente: ${adminUsername}`);
      }

    } catch (err) {
      console.error('Database Connection Failed for APP', err);
      throw err;
    }
  }
  return poolApp;
}
