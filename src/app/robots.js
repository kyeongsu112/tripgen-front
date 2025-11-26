export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/', // 검색에 안 나왔으면 하는 경로 (예시)
        },
        sitemap: 'https://tripgen.app/sitemap.xml',
    }
}
