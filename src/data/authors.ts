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
};

export default authors;
