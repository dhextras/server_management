package collector

import (
	"fmt"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemStats struct {
	Timestamp time.Time `json:"timestamp"`
	CPU       float64   `json:"cpu_percent"`
	Memory    MemStats  `json:"memory"`
	Disk      DiskStats `json:"disk"`
}

type MemStats struct {
	Total     uint64  `json:"total"`
	Available uint64  `json:"available"`
	Used      uint64  `json:"used"`
	Percent   float64 `json:"percent"`
}

type DiskStats struct {
	Total   uint64  `json:"total"`
	Free    uint64  `json:"free"`
	Used    uint64  `json:"used"`
	Percent float64 `json:"percent"`
}

func CollectSystemStats() (SystemStats, error) {
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err != nil {
		return SystemStats{}, fmt.Errorf("failed to get CPU stats: %w", err)
	}

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return SystemStats{}, fmt.Errorf("failed to get memory stats: %w", err)
	}

	diskInfo, err := disk.Usage("/")
	if err != nil {
		return SystemStats{}, fmt.Errorf("failed to get disk stats: %w", err)
	}

	return SystemStats{
		Timestamp: time.Now(),
		CPU:       cpuPercent[0],
		Memory: MemStats{
			Total:     memInfo.Total,
			Available: memInfo.Available,
			Used:      memInfo.Used,
			Percent:   memInfo.UsedPercent,
		},
		Disk: DiskStats{
			Total:   diskInfo.Total,
			Free:    diskInfo.Free,
			Used:    diskInfo.Used,
			Percent: diskInfo.UsedPercent,
		},
	}, nil
}

func FormatSystemStats(stats SystemStats) string {
	return fmt.Sprintf(
		"System Stats [%s]\n"+
			"CPU: %.1f%%\n"+
			"Memory: %.1f%% (%s/%s)\n"+
			"Disk: %.1f%% (%s/%s)\n",
		stats.Timestamp.Format("15:04:05"),
		stats.CPU,
		stats.Memory.Percent,
		formatBytes(stats.Memory.Used),
		formatBytes(stats.Memory.Total),
		stats.Disk.Percent,
		formatBytes(stats.Disk.Used),
		formatBytes(stats.Disk.Total),
	)
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
