#import "AppDelegate.h"

#import <RCTBundleURLProvider.h>
#import <Firebase.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Firebase before anything else
  [FIRApp configure];

  self.moduleName = @"Vaulted";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // RCTAppDelegate (which we extend) only knows how to create its window the legacy way,
  // directly here in didFinishLaunchingWithOptions -- it never implements
  // scene:willConnectToSession:options:. That was fine when UIApplicationSceneManifest was
  // just a declarative opt-in, but iOS 27 actually requires the scene connection callback to
  // run and do real work, not just a manifest declaring support (confirmed: crashes with
  // EXC_BREAKPOINT in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption even with
  // the manifest present, when window creation still happens on the legacy app-level path).
  // Defer to scene:willConnectToSession:options: below instead of the automatic legacy path.
  self.automaticallyLoadReactNativeWindow = NO;

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                  options:(UISceneConnectionOptions *)connectionOptions API_AVAILABLE(ios(13.0))
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }
  UIWindowScene *windowScene = (UIWindowScene *)scene;

  // Same window/root-view setup RCTAppDelegate's own (private, not declared in its public
  // header -- loadReactNativeWindow: -- so not safely callable from here) legacy-path method
  // does, reimplemented using only the documented overridable API (rootViewFactory,
  // createRootViewController, setRootView:toRootViewController:), and using
  // initWithWindowScene: (explicit) rather than initWithFrame: + relying on implicit
  // scene auto-association, which is what iOS 27+ actually requires.
  UIView *rootView = [self.rootViewFactory viewWithModuleName:self.moduleName
                                            initialProperties:self.initialProps
                                                launchOptions:nil];

  self.window = [[UIWindow alloc] initWithWindowScene:windowScene];
  UIViewController *rootViewController = [self createRootViewController];
  [self setRootView:rootView toRootViewController:rootViewController];
  self.window.windowScene.delegate = self;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
}

- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [super application:app openURL:url options:options];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
