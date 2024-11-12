/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
       remotePatterns: [
        {
          protocol: 'https',
          hostname: 'cdn.pixabay.com',
          port: '',
        },
        {
          hostname: 'res.cloudinary.com'
        },
        {
          hostname: 'th.bing.com'
        }
      ],
    }
};

export default nextConfig;
