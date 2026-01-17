'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs'
import {
  Activity, Mic, PieChart as PieChartIcon,
  Heart, Thermometer, Battery, Moon, Clock,
  TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react'

interface SleepData1 {
  id: number
  micRMS: number
  piezoPeak: number
  state: number
  timestamp: bigint
  createdAt: string
}

interface SleepData2 {
  id: number
  heartRate: number
  spo2: number
  temperature: number
  timestamp: bigint
  createdAt: string
}

interface Analytics {
  avgHeartRate: number
  avgSPO2: number
  avgTemperature: number
  sleepDuration: number
  snoreEvents: number
  movementEvents: number
  sleepQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent'
}

export default function Home() {
  const [data1, setData1] = useState<SleepData1[]>([])
  const [data2, setData2] = useState<SleepData2[]>([])
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    const fetchData = async () => {
      const [res1, res2] = await Promise.all([
        fetch(`/api/sleepdata1?range=${timeRange}`),
        fetch(`/api/sleepdata2?range=${timeRange}`)
      ])
      const data1 = await res1.json()
      const data2 = await res2.json()
      setData1(data1)
      setData2(data2)
    }
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [timeRange])

  // Analytics calculations
  const analytics = useMemo<Analytics>(() => {
    if (data1.length === 0 || data2.length === 0) {
      return {
        avgHeartRate: 0,
        avgSPO2: 0,
        avgTemperature: 0,
        sleepDuration: 0,
        snoreEvents: 0,
        movementEvents: 0,
        sleepQuality: 'Fair'
      }
    }

    // Calculate averages
    const avgHeartRate = data2.reduce((acc, curr) => acc + curr.heartRate, 0) / data2.length
    const avgSPO2 = data2.reduce((acc, curr) => acc + curr.spo2, 0) / data2.length
    const avgTemperature = data2.reduce((acc, curr) => acc + curr.temperature, 0) / data2.length

    // Detect snore events (micRMS > threshold)
    const snoreEvents = data1.filter(item => item.micRMS > 100).length

    // Detect movement events (piezoPeak > threshold when state is sleep)
    const movementEvents = data1.filter(item =>
      item.piezoPeak > 50 && item.state === 1
    ).length

    // Calculate sleep duration (based on state changes)
    let sleepDuration = 0
    let sleepStart: bigint | null = null
    data1.forEach(item => {
      if (item.state === 1 && sleepStart === null) {
        sleepStart = item.timestamp
      } else if (item.state === 0 && sleepStart !== null) {
        sleepDuration += Number(item.timestamp - sleepStart)
        sleepStart = null
      }
    })

    // Sleep quality calculation
    let sleepQuality: Analytics['sleepQuality'] = 'Fair'
    const qualityScore = (
      (avgSPO2 > 95 ? 25 : 15) +
      (avgHeartRate >= 60 && avgHeartRate <= 100 ? 25 : 15) +
      (snoreEvents < 10 ? 25 : 10) +
      (movementEvents < 20 ? 25 : 10)
    )

    if (qualityScore >= 90) sleepQuality = 'Excellent'
    else if (qualityScore >= 75) sleepQuality = 'Good'
    else if (qualityScore >= 60) sleepQuality = 'Fair'
    else sleepQuality = 'Poor'

    return {
      avgHeartRate: Math.round(avgHeartRate * 10) / 10,
      avgSPO2: Math.round(avgSPO2 * 10) / 10,
      avgTemperature: Math.round(avgTemperature * 10) / 10,
      sleepDuration: Math.round(sleepDuration / 3600000 * 10) / 10, // Convert to hours
      snoreEvents,
      movementEvents,
      sleepQuality
    }
  }, [data1, data2])

  // Prepare chart data
  const chartData1 = useMemo(() =>
    data1.map((item, index) => ({
      time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      micRMS: item.micRMS,
      piezoPeak: item.piezoPeak,
      state: item.state,
      isSnoring: item.micRMS > 100 ? 1 : 0,
      isMoving: item.piezoPeak > 50 ? 1 : 0
    })).slice(-50), // Last 50 data points
    [data1]
  )

  const chartData2 = useMemo(() =>
    data2.map((item, index) => ({
      time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      heartRate: item.heartRate,
      spo2: item.spo2,
      temperature: item.temperature,
      timestamp: Number(item.timestamp)
    })).slice(-50),
    [data2]
  )

  // Sleep state distribution
  const sleepStateData = useMemo(() => {
    const states = data1.reduce((acc, item) => {
      acc[item.state] = (acc[item.state] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    return Object.entries(states).map(([state, count]) => ({
      name: ['Awake', 'Light Sleep', 'Deep Sleep', 'REM'][parseInt(state)] || `State ${state}`,
      value: count,
      color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'][parseInt(state)]
    }))
  }, [data1])

  const qualityColor = {
    'Poor': 'text-red-500 bg-red-50',
    'Fair': 'text-yellow-500 bg-yellow-50',
    'Good': 'text-green-500 bg-green-50',
    'Excellent': 'text-emerald-500 bg-emerald-50'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sleep Monitoring Dashboard</h1>
        <p className="text-gray-600 mt-2">Real-time monitoring and analytics of sleep patterns</p>

        <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-4">
          <div className="w-full md:w-auto">
            <Tabs value={timeRange} onValueChange={setTimeRange} className="w-full md:w-[400px]">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="1h">1 Hour</TabsTrigger>
                <TabsTrigger value="12h">12 Hours</TabsTrigger>
                <TabsTrigger value="24h">24 Hours</TabsTrigger>
                <TabsTrigger value="7d">7 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Heart Rate</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgHeartRate} BPM</div>
            <p className="text-xs text-gray-500">
              {analytics.avgHeartRate < 60 ? 'Low' : analytics.avgHeartRate > 100 ? 'High' : 'Normal'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. SpO2</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgSPO2}%</div>
            <p className="text-xs text-gray-500">
              {analytics.avgSPO2 > 95 ? 'Excellent' : analytics.avgSPO2 > 90 ? 'Good' : 'Low'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Duration</CardTitle>
            <Moon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sleepDuration}h</div>
            <p className="text-xs text-gray-500">
              {analytics.sleepDuration >= 7 ? 'Optimal' : 'Insufficient'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Quality</CardTitle>
            <PieChartIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${qualityColor[analytics.sleepQuality].split(' ')[0]}`}>
              {analytics.sleepQuality}
            </div>
            <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${qualityColor[analytics.sleepQuality]}`}>
              {analytics.snoreEvents} snores, {analytics.movementEvents} movements
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Audio & Movement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio & Movement Monitoring
            </CardTitle>
            <CardDescription>Microphone RMS and Piezo sensor data</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData1}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="micRMS"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  name="Mic RMS"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="piezoPeak"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                  name="Piezo Peak"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="isSnoring"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Snoring"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-700 font-medium">Snore Events</div>
                <div className="text-2xl font-bold text-blue-900">{analytics.snoreEvents}</div>
                <div className="text-xs text-blue-600">
                  {analytics.snoreEvents > 10 ? 'High snoring detected' : 'Normal range'}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-700 font-medium">Movement Events</div>
                <div className="text-2xl font-bold text-green-900">{analytics.movementEvents}</div>
                <div className="text-xs text-green-600">
                  {analytics.movementEvents > 20 ? 'Restless sleep' : 'Peaceful sleep'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vital Signs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vital Signs Monitoring
            </CardTitle>
            <CardDescription>Heart rate, SpO2, and temperature</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Heart Rate (BPM)"
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spo2"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="SpO2 (%)"
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Temperature (°C)"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-sm text-red-600">HR Min/Max</div>
                <div className="font-bold">
                  {Math.min(...chartData2.map(d => d.heartRate))}/
                  {Math.max(...chartData2.map(d => d.heartRate))}
                </div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-sm text-blue-600">SpO2 Range</div>
                <div className="font-bold">
                  {Math.min(...chartData2.map(d => d.spo2))}-
                  {Math.max(...chartData2.map(d => d.spo2))}%
                </div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="text-sm text-yellow-600">Temp Avg</div>
                <div className="font-bold">{analytics.avgTemperature}°C</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleep State Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sleep State Distribution</CardTitle>
            <CardDescription>Time spent in different sleep stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sleepStateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sleepStateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} samples`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Event Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events Timeline</CardTitle>
            <CardDescription>Last 10 significant events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data1.slice(-10).reverse().map((item, index) => {
                const eventType = item.micRMS > 100 ? 'Snore' :
                  item.piezoPeak > 50 ? 'Movement' :
                    item.state === 0 ? 'Awake' : 'Sleep'
                const eventColor = {
                  'Snore': 'bg-red-100 text-red-800',
                  'Movement': 'bg-blue-100 text-blue-800',
                  'Awake': 'bg-yellow-100 text-yellow-800',
                  'Sleep': 'bg-green-100 text-green-800'
                }[eventType]

                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${eventColor}`}>
                        {eventType}
                      </div>
                      <div className="text-sm">
                        {eventType === 'Snore' && `Intensity: ${item.micRMS}`}
                        {eventType === 'Movement' && `Force: ${item.piezoPeak}`}
                        {eventType === 'Sleep' && `Stage: ${item.state}`}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sleep Data 1 (Raw)</CardTitle>
            <CardDescription>Mic and Piezo sensor readings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Time</th>
                    <th className="text-left p-3 text-sm font-medium">Mic RMS</th>
                    <th className="text-left p-3 text-sm font-medium">Piezo</th>
                    <th className="text-left p-3 text-sm font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {data1.slice(-10).reverse().map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <div className={`font-medium ${item.micRMS > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.micRMS}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className={`font-medium ${item.piezoPeak > 50 ? 'text-blue-600' : 'text-gray-900'}`}>
                          {item.piezoPeak}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${item.state === 0 ? 'bg-yellow-100 text-yellow-800' :
                            item.state === 1 ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                          }`}>
                          {['Awake', 'Light Sleep', 'Deep Sleep', 'REM'][item.state] || `State ${item.state}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sleep Data 2 (Raw)</CardTitle>
            <CardDescription>Vital signs readings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Time</th>
                    <th className="text-left p-3 text-sm font-medium">Heart Rate</th>
                    <th className="text-left p-3 text-sm font-medium">SpO2</th>
                    <th className="text-left p-3 text-sm font-medium">Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {data2.slice(-10).reverse().map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <div className={`font-medium ${item.heartRate < 60 || item.heartRate > 100 ? 'text-red-600' : 'text-green-600'
                          }`}>
                          {item.heartRate} BPM
                        </div>
                      </td>
                      <td className="p-3">
                        <div className={`font-medium ${item.spo2 < 90 ? 'text-red-600' : item.spo2 < 95 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                          {item.spo2}%
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">
                          {item.temperature}°C
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sleep Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Recommendations</h4>
              <ul className="text-sm space-y-1">
                {analytics.snoreEvents > 10 && (
                  <li className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Consider sleep position adjustment for snoring
                  </li>
                )}
                {analytics.sleepDuration < 7 && (
                  <li className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="w-4 h-4" />
                    Aim for at least 7 hours of sleep
                  </li>
                )}
                {analytics.avgSPO2 < 92 && (
                  <li className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Low SpO2 detected - consult a healthcare provider
                  </li>
                )}
              </ul>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Key Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sleep Efficiency</span>
                  <span className="font-medium">
                    {((data1.filter(d => d.state !== 0).length / data1.length) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Snore Index</span>
                  <span className="font-medium">
                    {(analytics.snoreEvents / (analytics.sleepDuration || 1)).toFixed(1)}/hour
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Movement Index</span>
                  <span className="font-medium">
                    {(analytics.movementEvents / (analytics.sleepDuration || 1)).toFixed(1)}/hour
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Sleep Trends</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Heart Rate Variability</span>
                  <span className="font-medium">
                    {Math.max(...chartData2.map(d => d.heartRate)) -
                      Math.min(...chartData2.map(d => d.heartRate))} BPM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deep Sleep Duration</span>
                  <span className="font-medium">
                    {((sleepStateData.find(d => d.name === 'Deep Sleep')?.value || 0) * 5 / 60).toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>REM Sleep</span>
                  <span className="font-medium">
                    {((sleepStateData.find(d => d.name === 'REM')?.value || 0) * 5 / 60).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}