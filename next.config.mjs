/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['pdfkit'],
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
    reactStrictMode: false
};

export default nextConfig;
