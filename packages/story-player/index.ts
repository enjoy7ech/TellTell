import { createApp } from 'vue';
import App from './App.vue';
import './index.css'; // Keep the existing global stylesheet

/**
 * Standard TellTell Layout Controller: Flat Theme (Vue v3)
 */
export class FlatLayout {
    private engine: any;

    constructor(engine: any) {
        this.engine = engine;
    }

    /**
     * Mount layout to the DOM using Vue
     */
    public async mount() {
        console.log("[Layout] Mounting Flat Layout (Vue version)...");
        
        // 1. Prepare mount container
        const container = document.createElement('div');
        container.id = 'app-layout';
        document.body.innerHTML = '';
        document.body.appendChild(container);

        // 2. Create and Mount Vue App
        const app = createApp(App, {
            engine: this.engine
        });

        app.mount('#app-layout');
        
        console.log("[Layout] Flat Layout Ready.");
    }
}
