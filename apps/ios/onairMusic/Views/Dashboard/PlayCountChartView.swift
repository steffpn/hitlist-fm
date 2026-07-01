import SwiftUI
import Charts

/// Bar chart showing play count trend over the selected time period.
/// Uses Swift Charts framework (iOS 16+).
struct PlayCountChartView: View {
    let data: [PlayCountBucket]
    let period: TimePeriod

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("PLAY COUNT TREND")
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)

            if data.isEmpty {
                Text("No data")
                    .font(.sora(13))
                    .foregroundStyle(Color.rbTextTertiary)
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else {
                Chart(chartData, id: \.bucket) { item in
                    BarMark(
                        x: .value("Date", item.date),
                        y: .value("Plays", item.playCount)
                    )
                    .foregroundStyle(item.isHighlight ? Color.rbAccent : Color.rbAccent.opacity(0.45))
                    .cornerRadius(4)
                }
                .chartXAxis {
                    AxisMarks(values: .automatic) { _ in
                        AxisGridLine()
                            .foregroundStyle(Color.rbHairline)
                        AxisValueLabel(format: xAxisFormat)
                            .font(.mono(10))
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { _ in
                        AxisGridLine()
                            .foregroundStyle(Color.rbHairline)
                        AxisValueLabel()
                            .font(.mono(10))
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                }
                .chartPlotStyle { plotArea in
                    plotArea
                        .background(Color.clear)
                }
                .frame(height: 200)
            }
        }
        .rbCard(radius: 20)
    }

    /// Filter buckets to only those with parseable dates.
    /// The peak-count bar and the most-recent (last) bar are flagged for a
    /// lighter highlight fill.
    private var chartData: [(bucket: String, date: Date, playCount: Int, isHighlight: Bool)] {
        let parsed: [(bucket: String, date: Date, playCount: Int)] = data.compactMap { bucket in
            guard let date = bucket.date else { return nil }
            return (bucket: bucket.bucket, date: date, playCount: bucket.playCount)
        }
        let peak = parsed.map(\.playCount).max()
        let lastBucket = parsed.last?.bucket
        return parsed.map { item in
            (
                bucket: item.bucket,
                date: item.date,
                playCount: item.playCount,
                isHighlight: item.bucket == lastBucket || (peak != nil && item.playCount == peak)
            )
        }
    }

    /// X-axis date format based on the selected period.
    private var xAxisFormat: Date.FormatStyle {
        switch period {
        case .day:
            return .dateTime.hour()
        case .week:
            return .dateTime.weekday(.abbreviated)
        case .month:
            return .dateTime.day()
        }
    }
}

#Preview {
    PlayCountChartView(
        data: [
            PlayCountBucket(bucket: "2026-03-16T00:00:00Z", playCount: 12, uniqueSongs: 5, uniqueArtists: 3),
            PlayCountBucket(bucket: "2026-03-16T01:00:00Z", playCount: 8, uniqueSongs: 4, uniqueArtists: 2),
            PlayCountBucket(bucket: "2026-03-16T02:00:00Z", playCount: 15, uniqueSongs: 6, uniqueArtists: 4),
        ],
        period: .day
    )
    .padding()
    .background(Color.rbBackground)
    .preferredColorScheme(.dark)
}
