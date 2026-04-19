/**
 * Injects release signing from upload-keystore.properties (or Gradle -P props)
 * so Play-ready AAB/APK work after expo prebuild.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// @generated cook-as-u-go upload keystore signing';

function appendSigningBlock(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }
  return `${contents.trimEnd()}

${MARKER}
afterEvaluate {
    def props = new Properties()
    def propsFile = null
    def androidDir = rootProject.projectDir
    def candidates = [
        new File(androidDir, "upload-keystore.properties"),
        new File(androidDir.parentFile, "credentials/upload-keystore.properties")
    ]
    for (def f : candidates) {
        if (f.exists()) {
            propsFile = f
            break
        }
    }
    if (propsFile != null) {
        propsFile.withReader("UTF-8") { props.load(it) }
    }
    def storePass = project.findProperty("uploadStorePassword") ?: props.getProperty("storePassword")
    def keyPass = project.findProperty("uploadKeyPassword") ?: props.getProperty("keyPassword")
    def keyAliasVal = project.findProperty("uploadKeyAlias") ?: props.getProperty("keyAlias")
    def storeRel = project.findProperty("uploadStoreFile") ?: props.getProperty("storeFile")
    if (storePass == null || keyPass == null || keyAliasVal == null || storeRel == null) {
        return
    }
    if (android.signingConfigs.findByName("releaseUpload") != null) {
        android.buildTypes.release.signingConfig = android.signingConfigs.releaseUpload
        return
    }
    def storePath = new File(androidDir, storeRel.toString())
    if (!storePath.isFile()) {
        throw new RuntimeException("Upload keystore not found: " + storePath + " (storeFile is relative to android/)")
    }
    android.signingConfigs.create("releaseUpload") {
        storeFile storePath
        storePassword storePass.toString()
        keyAlias keyAliasVal.toString()
        keyPassword keyPass.toString()
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.releaseUpload
}
`;
}

module.exports = function withUploadKeystoreSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = appendSigningBlock(modConfig.modResults.contents);
    return modConfig;
  });
}
