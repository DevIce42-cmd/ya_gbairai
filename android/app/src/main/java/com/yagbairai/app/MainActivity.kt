package com.yagbairai.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private val appUrl = "https://ya-gbairai-web-production.up.railway.app/"
    private var overlayLocksSwipe = false

    private val requestPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            notifyJsPermissionResult(isGranted)
        }

    private fun notifyJsPermissionResult(granted: Boolean) {
        runOnUiThread {
            webView.evaluateJavascript(
                "window.__onAndroidPermissionsResult && window.__onAndroidPermissionsResult(${if (granted) "true" else "false"});",
                null
            )
        }
    }

    private fun openExternalSafely(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: Exception) {
            // No handler installed for scheme (e.g. whatsapp://)
        }
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun hasNotificationPermission(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
        }

        @JavascriptInterface
        fun requestPermissions() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (hasNotificationPermission()) {
                    notifyJsPermissionResult(true)
                } else {
                    runOnUiThread {
                        requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
            } else {
                notifyJsPermissionResult(true)
            }
        }

        @JavascriptInterface
        fun setSwipeRefreshEnabled(enabled: Boolean) {
            runOnUiThread {
                overlayLocksSwipe = !enabled
                swipeRefresh.isEnabled = enabled && webView.scrollY == 0
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.parseColor("#0B141A")
        window.navigationBarColor = Color.parseColor("#0B141A")

        swipeRefresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(
                Color.parseColor("#25D366"),
                Color.parseColor("#00A884"),
                Color.parseColor("#53EB8D")
            )
            setProgressBackgroundColorSchemeColor(Color.parseColor("#111B21"))
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0B141A"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.setSupportMultipleWindows(true)
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.userAgentString = "${settings.userAgentString} YaGbairaiAndroid/1.1"

            addJavascriptInterface(NativeBridge(), "YaGbairaiNative")

            webChromeClient = object : WebChromeClient() {
                override fun onCreateWindow(
                    view: WebView?,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: Message?
                ): Boolean {
                    val tempWebView = WebView(this@MainActivity)
                    tempWebView.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            v: WebView?,
                            req: WebResourceRequest?
                        ): Boolean {
                            val targetUri = req?.url ?: return false
                            openExternalSafely(targetUri)
                            return true
                        }
                    }
                    val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                    transport.webView = tempWebView
                    resultMsg.sendToTarget()
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val uri = request?.url ?: return false
                    if (uri.host == "ya-gbairai-web-production.up.railway.app") {
                        return false
                    }
                    openExternalSafely(uri)
                    return true
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    swipeRefresh.isRefreshing = false
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        swipeRefresh.isRefreshing = false
                        val offlineHtml = """
                            <!DOCTYPE html>
                            <html lang="fr">
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                              <style>
                                body {
                                  margin: 0; min-height: 100vh; display: grid; place-items: center;
                                  background: #0B141A; color: #E9EDEF; font-family: sans-serif;
                                  text-align: center; padding: 24px;
                                }
                                .btn {
                                  margin-top: 18px; padding: 12px 24px; border-radius: 999px;
                                  border: none; background: linear-gradient(135deg,#25D366,#00A884);
                                  color: #06130B; font-weight: 800; font-size: 16px;
                                }
                              </style>
                            </head>
                            <body>
                              <div>
                                <div style="font-size:48px;">📡</div>
                                <h2>Pas de connexion !</h2>
                                <p style="color:#8696A0;">Vérifie ton réseau et relance Y'A GBAIRAI !</p>
                                <button class="btn" onclick="window.location.href='$appUrl'">Réessayer</button>
                              </div>
                            </body>
                            </html>
                        """.trimIndent()
                        view?.loadDataWithBaseURL(null, offlineHtml, "text/html", "UTF-8", null)
                    }
                }
            }
        }

        swipeRefresh.addView(webView)
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        // Only allow swipe-to-refresh when WebView is scrolled to top and no modal/intro is open
        webView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
            swipeRefresh.isEnabled = !overlayLocksSwipe && scrollY == 0
        }

        setContentView(swipeRefresh)

        val deepLink = intent?.dataString
        if (!deepLink.isNullOrBlank() && deepLink.startsWith("https://ya-gbairai-web-production.up.railway.app")) {
            webView.loadUrl(deepLink)
        } else {
            webView.loadUrl(appUrl)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }
}
