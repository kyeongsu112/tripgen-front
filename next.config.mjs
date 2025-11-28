/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'places.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
    ],
  },
  async rewrites() {
    // ✨ [수정됨] 개발 환경 vs 배포 환경 자동 구분
    const destination = process.env.NODE_ENV === 'development'
      ? 'http://localhost:8080/api/:path*'          // 로컬 개발 시
      : 'https://tripgen-server.onrender.com/api/:path*'; // 배포 시 (Render 주소)

    return [
      {
        source: '/api/:path*',
        destination: destination,
      },
    ];
  },
};

export default nextConfig;