package com.yagbairai.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private val appUrl = "https://ya-gbairai-web-production.up.railway.app/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.parseColor("#0B0912")
        window.navigationBarColor = Color.parseColor("#0B0912")

        swipeRefresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(
                Color.parseColor("#FF6B5B"),
                Color.parseColor("#FFB547"),
                Color.parseColor("#6366F1")
            )
            setProgressBackgroundColorSchemeColor(Color.parseColor("#171325"))
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0912"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.userAgentString = "${settings.userAgentString} YaGbairaiAndroid/1.0"

            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val uri = request?.url ?: return false
                    if (uri.host == "ya-gbairai-web-production.up.railway.app") {
                        return false
                    }
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
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
                                  background: #0B0912; color: #F7F4FF; font-family: sans-serif;
                                  text-align: center; padding: 24px;
                                }
                                .btn {
                                  margin-top: 18px; padding: 12px 24px; border-radius: 999px;
                                  border: none; background: linear-gradient(135deg,#FF6B5B,#FFB547);
                                  color: #fff; font-weight: 700; font-size: 16px;
                                }
                              </style>
                            </head>
                            <body>
                              <div>
                                <div style="font-size:48px;">📡</div>
                                <h2>Pas de connexion !</h2>
                                <p style="color:#ABA4C2;">Vérifie ton réseau et relance Y'A GBAIRAI !</p>
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

        // Only allow swipe-to-refresh when WebView is scrolled to top
        webView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
            swipeRefresh.isEnabled = scrollY == 0
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
