import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Remove splash once app has mounted
try {
	const splashRemover = () => {
		try {
			clearTimeout((window as any).__farmdirect_splash_timeout);
		} catch (e) {}
		const s = document.getElementById('splash');
		if (s) {
			s.style.opacity = '0';
			setTimeout(() => { s.remove(); }, 250);
		}
	};
	// When DOM is ready and app code executed, remove splash
	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		splashRemover();
	} else {
		document.addEventListener('DOMContentLoaded', splashRemover);
	}
} catch (e) {
	// noop
}
