import { Link } from 'react-router'
import { Flex, Text } from '@radix-ui/themes'

const Breadcrumb = ({ items }) => {
  return (
    <nav className="mb-6">
      <Flex align="center" gap="2">
        {items.map((item, index) => (
          <Flex key={index} align="center" gap="2">
            {item.href ? (
              <Link to={item.href}>
                <Text size="2" color="gray" className="hover:text-blue-600 transition-colors">
                  {item.label}
                </Text>
              </Link>
            ) : (
              <Text size="2" weight="medium">
                {item.label}
              </Text>
            )}

            {index < items.length - 1 && (
              <Text size="2" color="gray">
                →
              </Text>
            )}
          </Flex>
        ))}
      </Flex>
    </nav>
  )
}

export default Breadcrumb