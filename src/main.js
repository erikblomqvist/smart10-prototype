import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { setupI18n } from './lib/i18n.js';

setupI18n().then(() => {
	mount(App, { target: document.getElementById('app') });
});
