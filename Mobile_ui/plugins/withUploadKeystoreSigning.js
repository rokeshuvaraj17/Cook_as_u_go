/**
 * Injects Play / release signing: android/keystore.properties + storeFile relative to android/app/.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const L0 = '// @generated cook-as-u-go KEYPROP_LOADER_START';
const L1 = '// @generated cook-as-u-go KEYPROP_LOADER_END';
const S0 = '// @generated cook-as-u-go KEYPROP_SIGNING_START';
const S1 = '// @generated cook-as-u-go KEYPROP_SIGNING_END';
const W0 = '// @generated cook-as-u-go KEYPROP_WHEN_START';
const W1 = '// @generated cook-as-u-go KEYPROP_WHEN_END';

const LEGACY_UPLOAD_LOADER = /\/\/ @generated cook-as-u-go UPLOAD_KS_LOADER_START[\s\S]*?\/\/ @generated cook-as-u-go UPLOAD_KS_LOADER_END\n?/m;
const LEGACY_UPLOAD_INSIDE = /\/\/ @generated cook-as-u-go UPLOAD_KS_INSIDE_ANDROID_START[\s\S]*?\/\/ @generated cook-as-u-go UPLOAD_KS_INSIDE_ANDROID_END\n?/m;
const LEGACY_UPLOAD_APPLY = /\/\/ @generated cook-as-u-go UPLOAD_KS_APPLY_START[\s\S]*?\/\/ @generated cook-as-u-go UPLOAD_KS_APPLY_END\n?/m;
const LEGACY_UPLOAD_INSIDE_ONE = /\/\/ @generated cook-as-u-go UPLOAD_KS_INSIDE_ANDROID\n[\s\S]*?buildTypes\.release\.signingConfig = signingConfigs\.getByName\("releaseUpload"\)\n    \}\n/m;

const vanillaSigningConfigs = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const releaseSigningPatched = `        release {
            signingConfig keystoreFileExists ? signingConfigs.release : signingConfigs.debug
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.`;

const releaseSigningVanilla = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

/** Expo / RN templates sometimes omit the Caution comment block. */
const releaseSigningVanillaShort = `        release {
            signingConfig signingConfigs.debug`;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMarkers(contents) {
  return contents
    .replace(LEGACY_UPLOAD_LOADER, '')
    .replace(LEGACY_UPLOAD_INSIDE, '')
    .replace(LEGACY_UPLOAD_APPLY, '')
    .replace(LEGACY_UPLOAD_INSIDE_ONE, '')
    .replace(new RegExp(`${escapeRe(W0)}[\\s\\S]*?${escapeRe(W1)}\\n?`, 'm'), '')
    .replace(
      /\n            signingConfig keystoreFileExists \? signingConfigs\.release : signingConfigs\.debug\n/,
      '\n            signingConfig signingConfigs.debug\n'
    )
    .replace(
      new RegExp(`${escapeRe(S0)}[\\s\\S]*?${escapeRe(S1)}\\n?`, 'm'),
      vanillaSigningConfigs + '\n'
    )
    .replace(new RegExp(`${escapeRe(L0)}[\\s\\S]*?${escapeRe(L1)}\\n?`, 'm'), '');
}

function injectSigning(contents) {
  const out = stripMarkers(contents);

  const loader = `
${L0}
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
def keystoreFileExists = keystorePropertiesFile.exists() &&
    keystoreProperties['storePassword'] != null &&
    keystoreProperties['keyPassword'] != null &&
    keystoreProperties['keyAlias'] != null &&
    keystoreProperties['storeFile'] != null &&
    file(keystoreProperties['storeFile'].toString()).isFile()
${L1}
`;

  const signingBlock = `    ${S0}
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystoreFileExists) {
                keyAlias keystoreProperties['keyAlias'].toString()
                keyPassword keystoreProperties['keyPassword'].toString()
                storeFile file(keystoreProperties['storeFile'].toString())
                storePassword keystoreProperties['storePassword'].toString()
            }
        }
    }
    ${S1}`;

  const whenReady = `
${W0}
gradle.taskGraph.whenReady { graph ->
    def needsReleaseArtifact = graph.allTasks.any { t ->
        def n = t.name
        n == "bundleRelease" || n == "assembleRelease" || n == "packageRelease" || n.endsWith("ReleaseBundle")
    }
    if (needsReleaseArtifact && !keystoreFileExists) {
        throw new GradleException(
            "Google Play rejects debug-signed bundles. Add android/keystore.properties and android/app/upload-keystore.jks (see credentials/keystore.properties.example)."
        )
    }
}
${W1}
`;

  const jscAnchor = "def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'";
  if (!out.includes(jscAnchor)) {
    throw new Error('withUploadKeystoreSigning: jscFlavor anchor not found');
  }
  let next = out.replace(jscAnchor, jscAnchor + loader);

  if (!next.includes(vanillaSigningConfigs)) {
    throw new Error('withUploadKeystoreSigning: default signingConfigs anchor not found');
  }
  next = next.replace(vanillaSigningConfigs, signingBlock);

  const releaseSigningLines = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

  if (next.includes(releaseSigningLines)) {
    next = next.replace(releaseSigningLines, releaseSigningPatched);
  } else if (next.includes(releaseSigningVanillaShort)) {
    next = next.replace(
      releaseSigningVanillaShort,
      `        release {
            signingConfig keystoreFileExists ? signingConfigs.release : signingConfigs.debug`
    );
  } else if (!next.includes(releaseSigningPatched)) {
    throw new Error('withUploadKeystoreSigning: release buildType signing anchor not found');
  }

  const postAndroidAnchor = `    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
}
`;

  if (!next.includes(postAndroidAnchor)) {
    throw new Error('withUploadKeystoreSigning: androidResources anchor not found');
  }
  next = next.replace(postAndroidAnchor, postAndroidAnchor + whenReady);
  return next;
}

module.exports = function withUploadKeystoreSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = injectSigning(modConfig.modResults.contents);
    return modConfig;
  });
};
