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
        },
        {
          hostname: 'pps.whatsapp.net'
        }
      ],
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    }
};

export default nextConfig;
