// OCR a still with macOS Vision (zh-Hans + en): swift tools/ocr.swift <image> → one recognised line per row
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(2) }
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate; req.recognitionLanguages = ["zh-Hans", "en-US"]; req.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
for o in req.results ?? [] { if let c = o.topCandidates(1).first { print(c.string) } }
