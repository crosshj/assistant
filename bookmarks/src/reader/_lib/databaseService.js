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
			const result = this.db.exec(
				'SELECT * FROM metadata ORDER BY id LIMIT 1'
			);
			if (result.length === 0) {
				throw new Error('No metadata table found');
			}

			const row = result[0].values[0];
			const schema = JSON.parse(row[2]); // schema is the 3rd column (index 2)
			return {
				version: row[1],
				schema: schema,
			};
		} catch (error) {
			console.error('Error reading metadata:', error);
			// Return default metadata if table doesn't exist
			return {
				version: '1.0',
				schema: {
					type: 'list',
					fields: ['text'],
					controls: ['add', 'edit', 'delete', 'bulk-upsert'],
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
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				version TEXT NOT NULL,
				schema TEXT NOT NULL
			)
		`);

		// Insert default metadata
		const defaultSchema = {
			version: '1.0',
			title: 'My Database',
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
			controls: ['add', 'edit', 'delete', 'bulk-upsert'],
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

		// No sample data - start with empty table

		// Export database as ArrayBuffer
		const dbData = db.export();
		db.close();

		return dbData.buffer;
	}

	/**
	 * Update schema metadata
	 * @param {Object} metadata - Metadata to update
	 * @returns {Promise<void>}
	 */
	async updateSchema(metadata) {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		try {
			// Get current schema from database
			const currentMetadata = this.getMetadata();
			const currentSchema = currentMetadata.schema;
			console.log('Current schema before update:', currentSchema);

			// Update schema with new metadata
			const updatedSchema = {
				...currentSchema,
				title: metadata.title,
				description: metadata.description || '',
				fields: metadata.fields || currentSchema.fields || [],
				controls: metadata.controls ||
					currentSchema.controls || [
						'add',
						'edit',
						'delete',
						'bulk-upsert',
					],
			};
			console.log('Updated schema:', updatedSchema);

			// Ensure we have a valid schema object
			const schemaJson = JSON.stringify(updatedSchema);
			if (
				!schemaJson ||
				schemaJson === 'null' ||
				schemaJson === 'undefined'
			) {
				throw new Error('Invalid schema object');
			}

			// Check if metadata record exists first
			const countResult = this.db.exec(
				'SELECT COUNT(*) as count FROM metadata'
			);
			const count = countResult[0].values[0][0];

			if (count === 0) {
				// Record doesn't exist, create it
				const insertStmt = this.db.prepare(
					'INSERT INTO metadata (version, schema) VALUES (?, ?)'
				);
				insertStmt.run('1.0', schemaJson);
			} else {
				// Record exists, update the first one
				console.log('Updating existing metadata record');

				// Escape single quotes in the JSON string for SQL
				const escapedSchemaJson = schemaJson.replace(/'/g, "''");
				const updateQuery = `UPDATE metadata SET schema = '${escapedSchemaJson}' WHERE id = 1`;
				console.log(
					'Update query:',
					updateQuery.substring(0, 200) + '...'
				);
				const updateResult = this.db.exec(updateQuery);
				console.log('Update result:', updateResult);
			}

			// Update the current schema in memory
			this.schema = updatedSchema;

			// Update the database table structure to match the new schema
			await this.updateTableStructure(updatedSchema);

			// Verify the update worked by reading back from database
			const verifyStmt = this.db.prepare(
				'SELECT schema FROM metadata WHERE id = 1'
			);
			const verifyResult = verifyStmt.get();
			console.log('Verification - raw result:', verifyResult);
			if (verifyResult && verifyResult.schema) {
				const parsedSchema = JSON.parse(verifyResult.schema);
				console.log('Verification - parsed schema:', parsedSchema);
				console.log(
					'Verification - title in database:',
					parsedSchema.title
				);
			}
		} catch (error) {
			console.error('Error updating schema:', error);
			throw error;
		}
	}

	/**
	 * Update table structure to match the new schema
	 * @param {Object} schema - Updated schema
	 * @returns {Promise<void>}
	 */
	async updateTableStructure(schema) {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		try {
			const tableName = schema.tableName || 'items';
			const fields = schema.fields || [];

			// Get current table columns
			const tableInfo = this.db.exec(`PRAGMA table_info(${tableName})`);
			const currentColumns = tableInfo[0]?.values || [];
			const currentColumnNames = currentColumns.map((col) => col[1]); // Column name is at index 1

			// Get new column names from schema
			const newColumnNames = fields.map((field) => field.name);

			// Find columns to add and remove
			const columnsToAdd = newColumnNames.filter(
				(name) => !currentColumnNames.includes(name)
			);
			const columnsToRemove = currentColumnNames.filter(
				(name) => !newColumnNames.includes(name) && name !== 'id'
			);

			console.log('Columns to add:', columnsToAdd);
			console.log('Columns to remove:', columnsToRemove);

			// Add new columns
			for (const columnName of columnsToAdd) {
				const field = fields.find((f) => f.name === columnName);
				if (field) {
					let columnType = 'TEXT';
					if (field.type === 'integer') columnType = 'INTEGER';
					if (field.type === 'datetime') columnType = 'TEXT';

					const nullable = field.required ? 'NOT NULL' : '';
					const defaultValue = field.defaultValue
						? `DEFAULT '${field.defaultValue}'`
						: '';

					const alterQuery =
						`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType} ${nullable} ${defaultValue}`.trim();
					console.log('Adding column:', alterQuery);

					this.db.exec(alterQuery);
				}
			}

			// Note: SQLite doesn't support DROP COLUMN directly, so we'll leave removed columns
			// They'll just be ignored in the UI but remain in the database
			if (columnsToRemove.length > 0) {
				console.log(
					"Note: SQLite doesn't support dropping columns. These columns will remain in the database:",
					columnsToRemove
				);
			}

			console.log('Table structure updated successfully');
		} catch (error) {
			console.error('Error updating table structure:', error);
			throw error;
		}
	}

	/**
	 * Bulk upsert items into the database
	 * @param {Array} items - Array of items to upsert
	 * @param {string} tableName - Name of the table to upsert into
	 * @returns {Promise<void>}
	 */
	async bulkUpsert(items, tableName = 'items') {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		if (!Array.isArray(items) || items.length === 0) {
			throw new Error('Items must be a non-empty array');
		}

		try {
			// Get the current schema to understand the table structure
			const metadata = this.getMetadata();
			const schema = metadata.schema;

			// Get fields from the schema (it's a flat structure)
			const fields = schema.fields || [];

			// Get the primary key field
			const primaryKeyField = fields.find((field) => field.primaryKey);
			if (!primaryKeyField) {
				throw new Error(`No primary key found for table ${tableName}`);
			}

			// Prepare field names for the upsert statement
			const fieldNames = fields.map((field) => field.name).join(', ');

			// Process each item and build individual upsert queries
			for (const item of items) {
				const values = fields.map((field) => {
					if (field.autoIncrement && !item[field.name]) {
						return null; // Let auto-increment handle it
					}

					let value = item[field.name];

					// Handle different field types
					switch (field.type) {
						case 'datetime':
							if (field.name === 'created_at' && !value) {
								return new Date().toISOString();
							}
							if (field.name === 'modified_at') {
								return new Date().toISOString();
							}
							return value || null;
						case 'integer':
							return value ? parseInt(value) : null;
						case 'text':
						case 'enum':
						default:
							return value || null;
					}
				});

				// Build the upsert query for this specific item
				const valueStrings = values.map((value) => {
					if (value === null) return 'NULL';
					if (typeof value === 'string')
						return `'${value.replace(/'/g, "''")}'`;
					return value;
				});

				// Build update clause for non-primary key fields
				const updateFields = fields.filter(
					(field) => !field.primaryKey
				);
				const updateClause = updateFields
					.map((field) => {
						const fieldValue = valueStrings[fields.indexOf(field)];
						return `${field.name} = ${fieldValue}`;
					})
					.join(', ');

				const upsertQuery = `
					INSERT INTO ${tableName} (${fieldNames})
					VALUES (${valueStrings.join(', ')})
					ON CONFLICT(${primaryKeyField.name}) DO UPDATE SET
					${updateClause}
				`;

				this.db.exec(upsertQuery);
			}

			console.log(
				`Bulk upserted ${items.length} items into ${tableName}`
			);
		} catch (error) {
			console.error('Error in bulk upsert:', error);
			throw error;
		}
	}
}
