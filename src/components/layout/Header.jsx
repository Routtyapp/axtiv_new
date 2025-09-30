import { Flex, Heading, Separator } from '@radix-ui/themes'
import { Link } from 'react-router'

const Header = ({ title, subtitle, actions, showSeparator = true }) => {
  return (
    <div>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start">
          <div>
            <Heading as="h1" size="8" weight="bold">
              {title}
            </Heading>
            {subtitle && (
              <p className="text-gray-600 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <Flex gap="2" align="center">
              {actions}
            </Flex>
          )}
        </Flex>

        {showSeparator && <Separator size="4" />}
      </Flex>
    </div>
  )
}

export default Header