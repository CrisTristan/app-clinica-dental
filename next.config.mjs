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
        },
        {
          hostname: 'i.pravatar.cc'
        }
      ],
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    reactStrictMode: false
};

export default nextConfig;
