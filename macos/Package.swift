// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TransightMac",
    platforms: [.macOS(.v14)],
    products: [.library(name: "TransightCore", targets: ["TransightCore"])],
    targets: [
        .target(name: "TransightCore"),
        .testTarget(name: "TransightCoreTests", dependencies: ["TransightCore"])
    ]
)
