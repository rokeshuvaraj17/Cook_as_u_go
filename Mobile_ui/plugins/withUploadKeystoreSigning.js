/**
 * Play / release signing: configuration phase (after android {}), not afterEvaluate.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const L0 = '// @generated cook-as-u-go UPLOAD_KS_LOADER_START';
const L1 = '// @generated cook-as-u-go UPLOAD_KS_LOADER_END';
const A0 = '// @generated cook-as-u-go UPLOAD_KS_APPLY_START';
const A1 = '// @generated cook-as-u-go UPLOAD_KS_APPLY_END';

function stripMarkers(contents) {
  return contents
    .replace(new RegExp(`${escapeRe(L0)}[\\s\\S]*?${escapeRe(L1)}\\n?`, 'm'), '')
    .replace(new RegExp(`${escapeRe(A0)}[\\s\\S]*?${escapeRe(A1)}\\n?`, 'm'), '');
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectSigning(contents) {
  let out = stripMarkers(contents);
  if (out.includes(L0) || out.includes(A0)) return out;

  const loader = `
${L0}
def __uploadKsProps = new Properties()
def __uploadKsFile = rootProject.file("upload-keystore.properties")
if (!__uploadKsFile.exists()) {
    __uploadKsFile = rootProject.file("../credentials/upload-keystore.properties")
}
if (__uploadKsFile.exists()) {
    __uploadKsFile.withReader("UTF-8") { __uploadKsProps.load(it) }
}
def __storePass = project.findProperty("uploadStorePassword") ?: __uploadKsProps.getProperty("storePassword")
def __keyPass = project.findProperty("uploadKeyPassword") ?: __uploadKsProps.getProperty("keyPassword")
def __keyAlias = project.findProperty("uploadKeyAlias") ?: __uploadKsProps.getProperty("keyAlias")
def __storeRel = project.findProperty("uploadStoreFile") ?: __uploadKsProps.getProperty("storeFile")
def __uploadKsReady = false
if (__storePass != null && __keyPass != null && __keyAlias != null && __storeRel != null) {
    def __sf = rootProject.file(__storeRel.toString())
    if (__sf.isFile()) {
        __uploadKsReady = true
    } else {
        throw new java.io.FileNotFoundException("Upload keystore missing: " + __sf + " (storeFile is relative to android/)")
    }
}
${L1}
`;

  const apply = `
${A0}
if (__uploadKsReady) {
    if (android.signingConfigs.findByName("releaseUpload") == null) {
        android.signingConfigs.create("releaseUpload") {
            storeFile rootProject.file(__storeRel.toString())
            storePassword __storePass.toString()
            keyAlias __keyAlias.toString()
            keyPassword __keyPass.toString()
        }
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.getByName("releaseUpload")
}

gradle.taskGraph.whenReady { graph ->
    def needsReleaseArtifact = graph.allTasks.any { t ->
        def n = t.name
        n == "bundleRelease" || n == "assembleRelease" || n == "packageRelease" || n.endsWith("ReleaseBundle")
    }
    if (needsReleaseArtifact && !__uploadKsReady) {
        throw new GradleException(
            "Google Play rejects debug-signed bundles. Add credentials/upload-keystore.properties (see upload-keystore.properties.example) or pass -PuploadStorePassword -PuploadKeyPassword -PuploadKeyAlias -PuploadStoreFile=../credentials/upload-keystore.jks"
        )
    }
}
${A1}
`;

  const jscAnchor = "def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'";
  if (!out.includes(jscAnchor)) {
    throw new Error('withUploadKeystoreSigning: jscFlavor anchor not found');
  }
  out = out.replace(jscAnchor, jscAnchor + loader);

  const postAndroidAnchor = `    androidResources {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
}
`;

  if (!out.includes(postAndroidAnchor)) {
    throw new Error('withUploadKeystoreSigning: androidResources anchor not found');
  }
  out = out.replace(postAndroidAnchor, postAndroidAnchor + apply);
  return out;
}

module.exports = function withUploadKeystoreSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = injectSigning(modConfig.modResults.contents);
    return modConfig;
  });
};
