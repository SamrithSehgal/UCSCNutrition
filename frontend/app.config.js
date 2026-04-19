export default {
  expo: {
    name: "CampusPlates",
    slug: "slugeats",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    ios: {
      supportsTablet: false,
      bundleIdentifier: "edu.ucsc.slugeats",
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || "./GoogleService-Info.plist",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "edu.ucsc.slugeats",
      googleServicesFile: "./google-services.json",
    },
    plugins: [
      "expo-router",
      "@react-native-firebase/app",
      ["expo-build-properties", { ios: { useFrameworks: "static" } }],
    ],
    scheme: "slugeats",
    extra: {
      router: {},
      eas: {
        projectId: "b34382fe-d116-416c-a25d-1515c7c0ab5e",
      },
    },
    owner: "samrithsehgal",
  },
};
