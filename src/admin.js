import { mount } from 'svelte';
import AdminApp from './AdminApp.svelte';
import './admin.css';

const app = mount(AdminApp, { target: document.getElementById('app') });

export default app;
