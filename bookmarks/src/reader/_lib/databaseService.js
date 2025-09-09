import initSqlJs from 'sql.js';

/**
 * Database Service
 * Handles SQLite operations using sql.js for .smartText files
 */
export class DatabaseService {
	constructor() {
		this.db = null;
		this.version = null;
		this.schema = null;
		this.SQL = null;
	}

	/**
	 * Load database from file data
	 * @param {ArrayBuffer} fileData - File data as ArrayBuffer
	 * @returns {Promise<Object>} Database info with version and schema
	 */
	async loadFromFile(fileData) {
		try {
			// Initialize sql.js if not already done
			if (!this.SQL) {
				this.SQL = await initSqlJs({
					locateFile: (file) => {
						if (file.endsWith('.wasm')) {
							return new URL('./sql-wasm.wasm', import.meta.url)
								.href;
						}
						return file;
					},
				});
			}

			// Load the database
			this.db = new this.SQL.Database(new Uint8Array(fileData));

			// Get version and schema from metadata table
			const metadata = this.getMetadata();
			this.version = metadata.version;
			this.schema = metadata.schema;

			console.log('Database loaded:', {
				version: this.version,
				schema: this.schema,
				tables: this.getTableNames(),
			});

			return {
				version: this.version,
				schema: this.schema,
				tables: this.getTableNames(),
			};
		} catch (error) {
			console.error('Error loading database:', error);
			throw error;
		}
	}

	/**
	 * Get metadata from database
	 * @returns {Object} Metadata object with version and schema
	 */
	getMetadata() {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			const result = this.db.exec('SELECT * FROM metadata LIMIT 1');
			if (result.length === 0) {
				throw new Error('No metadata table found');
			}

			const row = result[0].values[0];
			return {
				version: row[0],
				schema: JSON.parse(row[1]),
			};
		} catch (error) {
			console.error('Error reading metadata:', error);
			// Return default metadata if table doesn't exist
			return {
				version: '1.0',
				schema: {
					type: 'list',
					fields: ['text'],
					controls: ['add', 'edit', 'delete'],
				},
			};
		}
	}

	/**
	 * Get all table names
	 * @returns {Array<string>} Array of table names
	 */
	getTableNames() {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			const result = this.db.exec(
				"SELECT name FROM sqlite_master WHERE type='table'"
			);
			return result[0]?.values?.map((row) => row[0]) || [];
		} catch (error) {
			console.error('Error getting table names:', error);
			return [];
		}
	}

	/**
	 * Query database table
	 * @param {string} tableName - Name of table to query
	 * @param {string} whereClause - Optional WHERE clause
	 * @returns {Array<Object>} Query results
	 */
	queryTable(tableName, whereClause = '') {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			const sql = `SELECT * FROM ${tableName} ${whereClause}`;
			const result = this.db.exec(sql);

			if (result.length === 0) {
				return [];
			}

			const columns = result[0].columns;
			const values = result[0].values;

			return values.map((row) => {
				const obj = {};
				columns.forEach((col, index) => {
					obj[col] = row[index];
				});
				return obj;
			});
		} catch (error) {
			console.error(`Error querying table ${tableName}:`, error);
			throw error;
		}
	}

	/**
	 * Insert data into table
	 * @param {string} tableName - Name of table
	 * @param {Object} data - Data to insert
	 * @returns {number} Insert ID
	 */
	insertData(tableName, data) {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			const columns = Object.keys(data);
			const values = Object.values(data);
			const placeholders = values.map(() => '?').join(', ');

			const sql = `INSERT INTO ${tableName} (${columns.join(
				', '
			)}) VALUES (${placeholders})`;
			const stmt = this.db.prepare(sql);
			stmt.run(values);

			return (
				this.db.exec('SELECT last_insert_rowid()')?.[0]
					?.values?.[0]?.[0] ?? 0
			);
		} catch (error) {
			console.error(`Error inserting into ${tableName}:`, error);
			throw error;
		}
	}

	/**
	 * Update data in table
	 * @param {string} tableName - Name of table
	 * @param {Object} data - Data to update
	 * @param {string} whereClause - WHERE clause
	 * @returns {number} Number of rows affected
	 */
	updateData(tableName, data, whereClause) {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			const setClause = Object.keys(data)
				.map((key) => `${key} = ?`)
				.join(', ');
			const values = Object.values(data);

			const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
			const stmt = this.db.prepare(sql);
			stmt.run(values);

			// Use SQLite's changes() function to get rows affected
			const result = this.db.exec('SELECT changes() AS rowsAffected');
			return result?.[0]?.values?.[0]?.[0] ?? 0;
		} catch (error) {
			console.error(`Error updating ${tableName}:`, error);
			throw error;
		}
	}

	/**
	 * Delete data from table
	 * @param {string} tableName - Name of table
	 * @param {string} whereClause - WHERE clause
	 * @returns {number} Number of rows affected
	 */
	deleteData(tableName, whereClause) {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
			const stmt = this.db.prepare(sql);
			stmt.run();

			// Use SQLite's changes() function to get rows affected
			const result = this.db.exec('SELECT changes() AS rowsAffected');
			return result?.[0]?.values?.[0]?.[0] ?? 0;
		} catch (error) {
			console.error(`Error deleting from ${tableName}:`, error);
			throw error;
		}
	}

	/**
	 * Get database as ArrayBuffer for saving
	 * @returns {ArrayBuffer} Database data
	 */
	exportDatabase() {
		if (!this.db) {
			throw new Error('Database not loaded');
		}

		try {
			return this.db.export().buffer;
		} catch (error) {
			console.error('Error exporting database:', error);
			throw error;
		}
	}

	/**
	 * Check if database is loaded
	 * @returns {boolean}
	 */
	isLoaded() {
		return this.db !== null;
	}

	/**
	 * Get current version
	 * @returns {string|null}
	 */
	getVersion() {
		return this.version;
	}

	/**
	 * Get current schema
	 * @returns {Object|null}
	 */
	getSchema() {
		return this.schema;
	}

	/**
	 * Close database connection
	 */
	close() {
		if (this.db) {
			this.db.close();
			this.db = null;
			this.version = null;
			this.schema = null;
		}
	}

	/**
	 * Create a barebones SQLite database with metadata and default tables
	 * @returns {Promise<ArrayBuffer>} Database data as ArrayBuffer
	 */
	async createBarebonesDatabase() {
		// Initialize sql.js if not already done
		if (!this.SQL) {
			this.SQL = await initSqlJs({
				locateFile: (file) => {
					if (file.endsWith('.wasm')) {
						return new URL('./sql-wasm.wasm', import.meta.url).href;
					}
					return file;
				},
			});
		}

		// Create new database
		const db = new this.SQL.Database();

		// Create metadata table
		db.exec(`
			CREATE TABLE metadata (
				version TEXT PRIMARY KEY,
				schema TEXT NOT NULL
			)
		`);

		// Insert default metadata
		const defaultSchema = {
			version: '1.0',
			type: 'list',
			tableName: 'items',
			fields: [
				{
					name: 'id',
					displayName: 'ID',
					type: 'integer',
					primaryKey: true,
					autoIncrement: true,
				},
				{
					name: 'text',
					displayName: 'Text',
					type: 'text',
					required: true,
				},
				{
					name: 'status',
					displayName: 'Status',
					type: 'enum',
					options: ['Todo', 'Doing', 'Done'],
					defaultValue: 'Todo',
				},
				{
					name: 'created_at',
					displayName: 'Created',
					type: 'datetime',
					readOnly: true,
				},
				{
					name: 'modified_at',
					displayName: 'Modified',
					type: 'datetime',
					readOnly: true,
				},
			],
			controls: ['add', 'edit', 'delete'],
		};

		const stmt = db.prepare(
			'INSERT INTO metadata (version, schema) VALUES (?, ?)'
		);
		stmt.run(['1.0', JSON.stringify(defaultSchema)]);

		// Create default items table based on schema
		db.exec(`
			CREATE TABLE items (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				text TEXT NOT NULL,
				status TEXT DEFAULT 'Todo' CHECK (status IN ('Todo', 'Doing', 'Done')),
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Create trigger to automatically update modified_at on UPDATE
		db.exec(`
			CREATE TRIGGER update_items_modified_at 
			AFTER UPDATE ON items
			BEGIN
				UPDATE items SET modified_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
			END
		`);

		// Insert sample data
		db.exec(`
			INSERT INTO items (text, status) VALUES 
			('Welcome to your new database', 'Done'),
			('This is a sample item', 'Todo')
		`);

		// Export database as ArrayBuffer
		const dbData = db.export();
		db.close();

		return dbData.buffer;
	}
}
