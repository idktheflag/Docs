// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'idkthedocs',
			components: {
				PageTitle: './src/components/PageTitle.astro',
			},
			// https://starlight.astro.build/reference/icons/
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/idktheflag' },
				{ icon: 'seti:html', label: 'Homepage', href: 'https://idktheflag.sh' }
			],
			sidebar: [
				{
					label: 'Getting Started with CTFs',
					autogenerate: { directory: 'gettingstarted' },
				},
				{
					label: 'Cryptography',
					autogenerate: { directory: 'crypto' },
				},
				{
					label: 'Tools',
					autogenerate: { directory: 'tools' },
				}
			],
		}),
	],
});
