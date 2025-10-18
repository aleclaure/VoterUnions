export default {
  expo: {
    name: "Voter Unions",
    slug: "voter-unions",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    extra: {
      supabaseUrl: "https://sonyiatltmqdyoezfbnj.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bmpoZmFlcGxid296YmhodWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDE2ODYsImV4cCI6MjA3NTIxNzY4Nn0.4PvbUvdYVHYV-6bzlW7bRBBIsejkPv59gIEzLmFroeA",
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    }
  }
};
