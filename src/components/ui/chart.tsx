import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: { color: COLORS } }
const COLORS = {
  light: {
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    card: "hsl(var(--card))",
    "card-foreground": "hsl(var(--card-foreground))",
    popover: "hsl(var(--popover))",
    "popover-foreground": "hsl(var(--popover-foreground))",
    primary: "hsl(var(--primary))",
    "primary-foreground": "hsl(var(--primary-foreground))",
    secondary: "hsl(var(--secondary))",
    "secondary-foreground": "hsl(var(--secondary-foreground))",
    muted: "hsl(var(--muted))",
    "muted-foreground": "hsl(var(--muted-foreground))",
    accent: "hsl(var(--accent))",
    "accent-foreground": "hsl(var(--accent-foreground))",
    destructive: "hsl(var(--destructive))",
    "destructive-foreground": "hsl(var(--destructive-foreground))",
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    radius: "0.5rem",
  },
  dark: {
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    card: "hsl(var(--card))",
    "card-foreground": "hsl(var(--card-foreground))",
    popover: "hsl(var(--popover))",
    "popover-foreground": "hsl(var(--popover-foreground))",
    primary: "hsl(var(--primary))",
    "primary-foreground": "hsl(var(--primary-foreground))",
    secondary: "hsl(var(--secondary))",
    "secondary-foreground": "hsl(var(--secondary-foreground))",
    muted: "hsl(var(--muted))",
    "muted-foreground": "hsl(var(--muted-foreground))",
    accent: "hsl(var(--accent))",
    "accent-foreground": "hsl(var(--accent-foreground))",
    destructive: "hsl(var(--destructive))",
    "destructive-foreground": "hsl(var(--destructive-foreground))",
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    radius: "0.5rem",
  },
};

type ChartContextProps = {
  theme?: keyof typeof COLORS;
  customColors?: Record<string, string>;
};

const ChartContext = React.createContext<ChartContextProps>({});

function Chart({
  theme = "light",
  customColors,
  className,
  ...props
}: React.ComponentProps<"div"> & ChartContextProps) {
  return (
    <ChartContext.Provider value={{ theme, customColors }}>
      <div
        data-theme={theme}
        className={cn("w-full h-full", className)}
        {...props}
      />
    </ChartContext.Provider>
  );
}

type ChartConfig = {
  [k: string]: {
    label?: string;
    icon?: React.ComponentType<{ className?: string }>;
  } & (
    | { color?: string; theme?: never }
    | { theme?: Record<keyof typeof COLORS, string>; color?: never }
  );
};

type ChartProps = Omit<
  React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>,
  "children"
> & {
  config: ChartConfig;
  children: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
};

type ChartDataChildProps = {
  dataKey?: string;
  stroke?: string;
  fill?: string;
  [key: string]: any;
};

// Define a type for the props of the outer chart element (e.g., BarChart)
type OuterChartElementProps = {
  children: React.ReactNode;
} & Record<string, any>;


function ChartContainer({ config, children, ...props }: ChartProps) {
  const { theme, customColors } = React.useContext(ChartContext);

  const chartColors = React.useMemo(() => {
    if (customColors) {
      return customColors;
    }

    return Object.entries(config).reduce((acc, [key, value]) => {
      if (value.color) {
        acc[key] = value.color;
      } else if (value.theme && theme) {
        acc[key] = value.theme[theme];
      }
      return acc;
    }, {} as Record<string, string>);
  }, [config, customColors, theme]);

  // Ensure 'children' is a valid React element before accessing its props
  const chartComponentWithColors = React.isValidElement(children)
    ? React.cloneElement(children, {
        ...(children.props as OuterChartElementProps), // Spread existing props
        children: React.Children.map((children.props as OuterChartElementProps).children, (dataChild) => {
          // Ensure dataChild is a valid React element and has props before accessing them
          if (React.isValidElement(dataChild) && dataChild.props && 'dataKey' in dataChild.props) {
            const dataChildProps = dataChild.props as ChartDataChildProps;
            const dataKey = dataChildProps.dataKey as string;
            const stroke = dataChildProps.stroke || chartColors[dataKey];
            const fill = dataChildProps.fill || chartColors[dataKey];

            return React.cloneElement(dataChild, {
              ...dataChildProps, // Spread all existing props
              stroke: stroke,
              fill: fill,
            } as ChartDataChildProps); // Cast the resulting props object to resolve TS2769 (Error 6)
          }
          return dataChild;
        }),
      } as Partial<OuterChartElementProps>) // Cast the resulting props object for cloneElement
    : children;

  return (
    <RechartsPrimitive.ResponsiveContainer {...props}>
      {chartComponentWithColors}
    </RechartsPrimitive.ResponsiveContainer>
  );
}

export { Chart, ChartContainer };