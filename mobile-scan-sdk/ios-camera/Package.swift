// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IOSCamera",
    platforms: [.iOS(.v16)],
    products: [
        .library(name: "IOSCamera", targets: ["IOSCamera"])
    ],
    targets: [
        .target(
            name: "IOSCamera",
            path: "Sources"
        ),
        .testTarget(
            name: "IOSCameraTests",
            dependencies: ["IOSCamera"],
            path: "Tests"
        )
    ]
)
