export interface Author {
	name: string;
	avatar: string;
	url?: string;
}

const authors: Record<string, Author> = {
	// Add authors here. Avatar can be a URL or a local path.
	// Using GitHub avatars: https://github.com/{username}.png
	riverxia: {
		name: 'Riverxia',
		avatar: 'https://idktheflag.sh/pfps/riverxia.png',
		url: 'https://riverxia.vercel.app',
	},
	zemi: {
		name: 'Zemi',
		avatar: 'https://idktheflag.sh/pfps/zemi.png',
		url: 'https://ianmattas.com',
	},
	quickshot: {
		name: 'Qu1ck5h0t',
		avatar: 'https://idktheflag.sh/pfps/quickshot.png',
		url: 'https://qu1ck5h0t.github.io/',
	}
};

export default authors;
