#import <Cocoa/Cocoa.h>

int main() {
    [NSApplication sharedApplication];
    id win = [[NSWindow alloc] initWithContentRect:NSMakeRect(100,100,400,300)
        styleMask:(NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskResizable)
        backing:NSBackingStoreBuffered defer:NO];
    [win makeKeyAndOrderFront:nil];
    [NSApp run];
}
