import { Pool } from 'pg'

const pool = new Pool ({
    host: 'localhost',
    port: 5432,
    database: '',
    user: '',
    password: ''
})

export default pool