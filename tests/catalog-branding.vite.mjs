import { mergeConfig } from 'vite';
import base from '../vite.config.js';
const target = process.env.CATALOG_TEST_API || 'http://127.0.0.1:54333';
if (new URL(target).hostname !== '127.0.0.1') throw new Error('Local fixture only');
export default mergeConfig(base, { server: { proxy: { '/api/catalog-presentation': target } } });
