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
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Tools',
					autogenerate: { directory: 'tools' },
				}
			],
		}),
	],
});
