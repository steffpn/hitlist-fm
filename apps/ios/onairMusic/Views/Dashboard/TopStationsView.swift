import SwiftUI
import Charts

/// Horizontal bar chart showing top stations ranked by play count.
/// Uses Swift Charts framework (iOS 16+).
struct TopStationsView: View {
    let stations: [StationPlayCount]

    /// Maximum 10 stations displayed.
    private var displayStations: [StationPlayCount] {
        Array(stations.prefix(10))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("TOP STATIONS")
                .font(.sora(10, .semibold))
                .tracking(1.4)
                .foregroundStyle(Color.rbTextTertiary)

            if displayStations.isEmpty {
                Text("No station data")
                    .font(.sora(13))
                    .foregroundStyle(Color.rbTextTertiary)
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else {
                Chart(displayStations) { station in
                    BarMark(
                        x: .value("Plays", station.playCount),
                        y: .value("Station", station.stationName)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.rbGradientStart, .rbGradientEnd],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(4)
                    .annotation(position: .trailing, alignment: .leading, spacing: 6) {
                        Text("\(station.playCount)")
                            .font(.mono(11, .medium))
                            .foregroundStyle(Color.rbTextSecondary)
                    }
                }
                .chartYAxis {
                    AxisMarks { _ in
                        AxisValueLabel()
                            .font(.sora(11, .medium))
                            .foregroundStyle(Color.rbTextPrimary)
                    }
                }
                .chartXAxis {
                    AxisMarks(position: .bottom) { _ in
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
                .frame(height: CGFloat(displayStations.count * 44))
            }
        }
        .rbCard(radius: 20)
    }
}

#Preview {
    TopStationsView(stations: [
        StationPlayCount(stationId: 1, stationName: "Kiss FM", playCount: 45),
        StationPlayCount(stationId: 2, stationName: "Europa FM", playCount: 38),
        StationPlayCount(stationId: 3, stationName: "Radio ZU", playCount: 27),
        StationPlayCount(stationId: 4, stationName: "Pro FM", playCount: 19),
        StationPlayCount(stationId: 5, stationName: "Radio 21", playCount: 11),
    ])
    .padding()
    .background(Color.rbBackground)
    .preferredColorScheme(.dark)
}
