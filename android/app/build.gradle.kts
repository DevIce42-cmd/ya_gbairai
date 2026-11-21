plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.yagbairai.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.yagbairai.app"
        minSdk = 24
        targetSdk = 34
        versionCode = System.getenv("ANDROID_VERSION_CODE")?.toIntOrNull() ?: 100
        versionName = System.getenv("ANDROID_VERSION_NAME") ?: "1.1.0"
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "debug-shared.keystore")
            storePassword = System.getenv("ANDROID_STORE_PASSWORD") ?: "android"
            keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "androiddebugkey"
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
